#!/usr/bin/env bun

import {
  appendFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

type Tweet = {
  id?: string | number;
  id_str?: string;
  user?: { id?: string | number; id_str?: string };
};

type SearchResponse = { next_cursor?: string | null; tweets: Tweet[] };
type Interval = { start: number; end: number };
type State = { pending: Interval[]; completed: number; split: number };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function arg(name: string, fallback?: string) {
  const index = process.argv.findIndex(
    (value) => value === name || value.startsWith(`${name}=`),
  );
  if (index < 0) return fallback;
  const value = process.argv[index];
  return value.includes("=")
    ? value.slice(value.indexOf("=") + 1)
    : process.argv[index + 1];
}

function id(value: unknown) {
  return value == null ? undefined : String(value);
}

function day(value: string, name: string) {
  const time = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(time)) throw new Error(`${name} must be YYYY-MM-DD`);
  return time;
}

async function existingIds(path: string) {
  const ids = new Set<string>();
  if (!existsSync(path)) return ids;
  const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line) continue;
    const tweet = JSON.parse(line) as Tweet;
    const tweetId = id(tweet.id_str ?? tweet.id);
    if (tweetId) ids.add(tweetId);
  }
  return ids;
}

function saveState(path: string, state: State) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
}

async function fetchPage(baseUrl: string, apiKey: string, query: string) {
  const url = new URL("/twitter/search", baseUrl);
  url.searchParams.set("query", query);
  url.searchParams.set("type", "Latest");
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(180_000),
    }).catch(() => undefined);
    if (response?.ok) {
      const json = (await response.json()) as SearchResponse;
      if (!Array.isArray(json.tweets)) throw new Error("Invalid search response");
      return json;
    }
    if (response && response.status < 500 && ![404, 429].includes(response.status)) {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
    }
    const retryAfter = Number(response?.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1_000
      : Math.min(60_000, attempt * 5_000);
    console.warn(`search status=${response?.status ?? "network"}; retry=${Math.ceil(delay / 1_000)}s`);
    await sleep(delay);
  }
  throw new Error("Search retries exhausted");
}

async function main() {
  const apiKey = process.env.SOCIALAPI_KEY;
  const baseUrl = arg("--base-url", process.env.SOCIALAPI_BASE_URL ?? "https://docial.nulo.lol")!;
  const handle = arg("--handle")?.replace(/^@/, "");
  const userId = arg("--user-id");
  const since = arg("--since");
  const until = arg("--until");
  const outPath = arg("--out");
  const querySuffix = arg("--query-suffix", "")!.trim();
  const minWindowSeconds = Number(arg("--min-window-seconds", "60"));
  const pageCapacity = Number(arg("--page-capacity", "20"));
  if (!apiKey || !handle || !userId || !since || !until || !outPath) {
    throw new Error("Required: SOCIALAPI_KEY, --handle, --user-id, --since, --until, --out");
  }
  const coveragePath = arg("--coverage", `${outPath}.adaptive-coverage.jsonl`)!;
  const statePath = arg("--state", `${outPath}.adaptive-state.json`)!;
  mkdirSync(dirname(outPath), { recursive: true });
  const start = day(since, "--since");
  const end = day(until, "--until");
  if (end <= start) throw new Error("--until must be after --since");
  const state: State = existsSync(statePath)
    ? JSON.parse(readFileSync(statePath, "utf8"))
    : { pending: [{ start, end }], completed: 0, split: 0 };
  const seen = await existingIds(outPath);
  while (state.pending.length > 0) {
      const interval = state.pending.pop()!;
      const query = [
        `from:${handle}`,
        `since_time:${Math.floor(interval.start / 1_000)}`,
        `until_time:${Math.floor(interval.end / 1_000)}`,
        querySuffix,
      ]
        .filter(Boolean)
        .join(" ");
      const response = await fetchPage(baseUrl, apiKey, query);
      let written = 0;
      for (const tweet of response.tweets) {
        if (id(tweet.user?.id_str ?? tweet.user?.id) !== userId) continue;
        const tweetId = id(tweet.id_str ?? tweet.id);
        if (!tweetId || seen.has(tweetId)) continue;
        seen.add(tweetId);
        appendFileSync(outPath, `${JSON.stringify(tweet)}\n`);
        written += 1;
      }
      const durationSeconds = (interval.end - interval.start) / 1_000;
      const saturated = response.tweets.length >= pageCapacity;
      if (saturated && durationSeconds > minWindowSeconds) {
        const midpoint = interval.start + Math.floor((interval.end - interval.start) / 2);
        state.pending.push(
          { start: midpoint, end: interval.end },
          { start: interval.start, end: midpoint },
        );
        state.split += 1;
      } else {
        state.completed += 1;
        appendFileSync(coveragePath, `${JSON.stringify({
          since_time: Math.floor(interval.start / 1_000),
          until_time: Math.floor(interval.end / 1_000),
          fetched: response.tweets.length,
          written,
          saturated,
          min_window_reached: saturated && durationSeconds <= minWindowSeconds,
          completed_at: new Date().toISOString(),
        })}\n`);
      }
      saveState(statePath, state);
      console.log(
        `pending=${state.pending.length} completed=${state.completed} split=${state.split} fetched=${response.tweets.length} wrote=${written} seconds=${durationSeconds}`,
      );
      await sleep(300);
  }
  console.log(`Done. unique=${seen.size} file=${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

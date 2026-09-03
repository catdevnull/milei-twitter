#!/usr/bin/env node
// Downloads the retweeters (reposters) of specific tweets, one JSONL per
// tweet, resumable via per-tweet state files and deduplicated by user id.

import {
  appendFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";

type TwitterUser = {
  id?: string | number;
  id_str?: string;
  [key: string]: unknown;
};

type EngagementResponse = {
  next_cursor?: string | null;
  users?: TwitterUser[];
};

type State = {
  cursor: string | null;
  page: number;
  unique: number;
  finished?: boolean;
  updated_at: string;
};

const EMPTY_PAGE_LIMIT = 15;

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

function userId(user: TwitterUser) {
  const value = user.id_str ?? user.id;
  return value == null ? undefined : String(value);
}

async function existingIds(path: string) {
  const ids = new Set<string>();
  if (!existsSync(path)) return ids;
  const lines = createInterface({
    input: createReadStream(path),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (!line) continue;
    const id = userId(JSON.parse(line) as TwitterUser);
    if (id) ids.add(id);
  }
  return ids;
}

function saveState(path: string, state: State) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
}

async function fetchPage(
  baseUrl: string,
  apiKey: string,
  tweetId: string,
  cursor?: string,
) {
  const url = new URL(`/twitter/tweet/${tweetId}/retweeted-by`, baseUrl);
  if (cursor) url.searchParams.set("cursor", cursor);

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(180_000),
    }).catch(() => undefined);
    if (response?.ok) {
      const json = (await response.json()) as EngagementResponse;
      if (!Array.isArray(json.users)) {
        throw new Error("Invalid response: users is not an array");
      }
      return json;
    }
    if (response && response.status < 500 && response.status !== 429) {
      throw new Error(
        `${response.status} ${response.statusText}: ${await response.text()}`,
      );
    }
    const retryAfter = Number(response?.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1_000
      : Math.min(60_000, attempt * 5_000);
    console.warn(
      `retweeted-by status=${response?.status ?? "network"}; retry=${Math.ceil(delay / 1_000)}s attempt=${attempt}/30`,
    );
    await sleep(delay);
  }
  throw new Error("Retweeter request retries exhausted");
}

async function fetchTweet(
  baseUrl: string,
  apiKey: string,
  tweetId: string,
  outDir: string,
  delayMs: number,
) {
  const outPath = join(outDir, `retweeters-${tweetId}.jsonl`);
  const statePath = `${outPath}.state.json`;
  const seen = await existingIds(outPath);
  const saved = existsSync(statePath)
    ? (JSON.parse(readFileSync(statePath, "utf8")) as State)
    : undefined;
  if (saved?.finished) {
    console.log(`tweet=${tweetId} already finished with ${saved.unique} users`);
    return;
  }
  let cursor = saved?.cursor ?? undefined;
  let page = saved?.page ?? 0;
  const seenCursors = new Set<string>(cursor ? [cursor] : []);

  console.log(
    `tweet=${tweetId} existing=${seen.size} out=${outPath}`,
  );
  let consecutiveStale = 0;
  for (;;) {
    const response = await fetchPage(baseUrl, apiKey, tweetId, cursor ?? undefined);
    page += 1;
    let written = 0;
    for (const user of response.users ?? []) {
      const id = userId(user);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      appendFileSync(outPath, `${JSON.stringify(user)}\n`);
      written += 1;
    }

    const nextCursor = response.next_cursor ?? null;
    // X keeps serving empty or fully-duplicate pages once a list is
    // exhausted (with an advancing or repeating cursor); treat a run of
    // pages without new users as the natural end instead of looping.
    consecutiveStale = written === 0 ? consecutiveStale + 1 : 0;
    if (!nextCursor || consecutiveStale >= EMPTY_PAGE_LIMIT) {
      saveState(statePath, {
        cursor: null,
        page,
        unique: seen.size,
        finished: true,
        updated_at: new Date().toISOString(),
      });
      console.log(
        `tweet=${tweetId} exhausted after ${page} pages (${consecutiveStale} without progress); unique=${seen.size}`,
      );
      break;
    }
    saveState(statePath, {
      cursor: nextCursor,
      page,
      unique: seen.size,
      updated_at: new Date().toISOString(),
    });
    console.log(
      `tweet=${tweetId} page=${page} fetched=${response.users?.length ?? 0} wrote=${written} unique=${seen.size} next_cursor=${Boolean(nextCursor)}`,
    );
    if (!nextCursor) break;
    if (seenCursors.has(nextCursor)) {
      if (written === 0) {
        saveState(statePath, {
          cursor: null,
          page,
          unique: seen.size,
          finished: true,
          updated_at: new Date().toISOString(),
        });
        console.log(
          `tweet=${tweetId} cursor stalled on page ${page} without progress; unique=${seen.size}`,
        );
        break;
      }
      throw new Error(`Repeated cursor at page ${page} for tweet ${tweetId}`);
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
    if (delayMs > 0) await sleep(delayMs);
  }
  console.log(`Done tweet=${tweetId} unique=${seen.size} pages=${page}`);
}

async function main() {
  const apiKey =
    process.env.TWITTER_GATEWAY_API_KEY ?? process.env.SOCIALAPI_KEY;
  const baseUrl = arg(
    "--base-url",
    process.env.TWITTER_GATEWAY_URL ?? "https://docial.nulo.lol",
  )!;
  const tweets = (arg("--tweets") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const outDir = arg("--out-dir", "./data/engagement")!;
  const delayMs = Number(arg("--delay-ms", "250"));

  if (!apiKey) throw new Error("Required: TWITTER_GATEWAY_API_KEY");
  if (tweets.length === 0) throw new Error("Required: --tweets id1,id2,...");
  mkdirSync(outDir, { recursive: true });

  for (const tweetId of tweets) {
    await fetchTweet(baseUrl, apiKey, tweetId, outDir, delayMs);
  }
  console.log(`All tweets done: ${tweets.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node

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

type TwitterUser = {
  id?: string | number;
  id_str?: string;
  [key: string]: unknown;
};

type FollowersResponse = {
  next_cursor?: string | null;
  users?: TwitterUser[];
};

type State = {
  cursor: string | null;
  page: number;
  unique: number;
  updated_at: string;
};

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
  targetUserId: string,
  cursor?: string,
) {
  const url = new URL("/twitter/followers/list", baseUrl);
  url.searchParams.set("user_id", targetUserId);
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
      const json = (await response.json()) as FollowersResponse;
      if (!Array.isArray(json.users)) {
        throw new Error("Invalid followers response: users is not an array");
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
      `followers status=${response?.status ?? "network"}; retry=${Math.ceil(delay / 1_000)}s attempt=${attempt}/30`,
    );
    await sleep(delay);
  }
  throw new Error("Follower request retries exhausted");
}

async function main() {
  const apiKey =
    process.env.TWITTER_GATEWAY_API_KEY ?? process.env.SOCIALAPI_KEY;
  const baseUrl = arg(
    "--base-url",
    process.env.TWITTER_GATEWAY_URL ?? "https://docial.nulo.lol",
  )!;
  const targetUserId = arg("--user-id");
  const limitArgument = arg("--limit", "100000")!;
  const fetchAll = limitArgument.toLowerCase() === "all";
  const limit = fetchAll ? Number.POSITIVE_INFINITY : Number(limitArgument);
  const outPath = arg(
    "--out",
    `./data/${targetUserId ?? "unknown"}.followers.jsonl`,
  )!;
  const statePath = arg("--state", `${outPath}.state.json`)!;
  const delayMs = Number(arg("--delay-ms", "250"));

  if (!apiKey || !targetUserId) {
    throw new Error(
      "Required: TWITTER_GATEWAY_API_KEY and --user-id (plus optional --limit and --out)",
    );
  }
  if (!fetchAll && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error("--limit must be a positive integer or 'all'");
  }
  mkdirSync(dirname(outPath), { recursive: true });

  const seen = await existingIds(outPath);
  const saved = existsSync(statePath)
    ? (JSON.parse(readFileSync(statePath, "utf8")) as State)
    : undefined;
  let cursor = saved?.cursor ?? undefined;
  let page = saved?.page ?? 0;
  const seenCursors = new Set<string>(cursor ? [cursor] : []);

  const targetLabel = fetchAll ? "all" : String(limit);
  console.log(
    `Fetching followers user_id=${targetUserId} target=${targetLabel} existing=${seen.size} out=${outPath}`,
  );
  while (seen.size < limit) {
    const response = await fetchPage(
      baseUrl,
      apiKey,
      targetUserId,
      cursor ?? undefined,
    );
    page += 1;
    let written = 0;
    for (const user of response.users ?? []) {
      const id = userId(user);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      appendFileSync(outPath, `${JSON.stringify(user)}\n`);
      written += 1;
      if (seen.size >= limit) break;
    }

    const nextCursor = response.next_cursor ?? null;
    saveState(statePath, {
      cursor: nextCursor,
      page,
      unique: seen.size,
      updated_at: new Date().toISOString(),
    });
    console.log(
      `page=${page} fetched=${response.users?.length ?? 0} wrote=${written} unique=${seen.size}/${targetLabel} next_cursor=${Boolean(nextCursor)}`,
    );
    if (seen.size >= limit) break;
    if (!nextCursor) {
      if (fetchAll) break;
      throw new Error(`Follower timeline ended at ${seen.size}`);
    }
    if (seenCursors.has(nextCursor)) {
      throw new Error(`Twitter returned a repeated cursor at ${seen.size}`);
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
    if (delayMs > 0) await sleep(delayMs);
  }
  console.log(`Done. unique=${seen.size} pages=${page} file=${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

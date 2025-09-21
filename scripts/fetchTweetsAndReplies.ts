#!/usr/bin/env bun

/**
 * Fetch all tweets and replies for a Twitter user via SocialAPI and save as JSONL.
 *
 * Usage:
 *   bun scripts/fetchTweetsAndReplies.ts --user-id 44196397 \
 *     --out ./data/elonmusk.tweets-and-replies.jsonl
 *
 * Env:
 *   SOCIALAPI_KEY=...
 */

import { createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

type SocialApiTweet = {
  id_str?: string;
  id?: string | number;
  tweet_created_at?: string;
  text?: string | null;
  full_text?: string | null;
  [key: string]: unknown;
};

type TimelineResponse = {
  next_cursor?: string | null;
  tweets: SocialApiTweet[];
};

function getArg(flag: string, fallback?: string): string | undefined {
  const idx = process.argv.findIndex(
    (a) => a === flag || a.startsWith(`${flag}=`)
  );
  if (idx === -1) return fallback;
  const val = process.argv[idx];
  if (val.includes("=")) return val.slice(val.indexOf("=") + 1);
  return process.argv[idx + 1];
}

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  return String(value);
}

async function fetchPage(
  apiKey: string,
  userId: string,
  kind: "tweets" | "tweets-and-replies",
  cursor?: string
): Promise<TimelineResponse> {
  const baseUrl = `https://api.socialapi.me/twitter/user/${encodeURIComponent(userId)}/${kind}`;
  const url = cursor
    ? `${baseUrl}?cursor=${encodeURIComponent(cursor)}`
    : baseUrl;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Request failed: ${res.status} ${res.statusText} — ${body}`
    );
  }

  const json = (await res.json()) as TimelineResponse;
  if (!json || !Array.isArray(json.tweets)) {
    throw new Error(
      `Unexpected response shape: ${JSON.stringify(json).slice(0, 500)}...`
    );
  }
  return json;
}

async function main(): Promise<void> {
  const apiKey = process.env.SOCIALAPI_KEY;
  const userId = getArg("--user-id");
  const outPath =
    getArg("--out") ?? `./data/${userId ?? "unknown"}.tweets-and-replies.jsonl`;
  const startCursor = getArg("--cursor");
  const kind =
    (getArg("--kind", "tweets-and-replies") as
      | "tweets"
      | "tweets-and-replies") ?? "tweets-and-replies";
  const maxPages = Number(getArg("--max-pages", "0")); // 0 = no limit
  const overwrite =
    getArg("--overwrite") === "true" || getArg("--overwrite") === "1";

  if (!apiKey) {
    console.error("Missing API key. Provide via SOCIALAPI_KEY env.");
    process.exit(1);
  }
  if (!userId) {
    console.error(
      "Missing --user-id. Example: bun scripts/fetchTweetsAndReplies.ts --user-id 44196397"
    );
    process.exit(1);
  }

  const dir = dirname(outPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (overwrite && existsSync(outPath)) {
    rmSync(outPath);
  }

  console.log(`Fetching '${kind}' for user_id=${userId} -> ${outPath}`);

  const writeStream = createWriteStream(outPath, { flags: "a" });
  writeStream.on("error", (err) => {
    console.error("Write stream error:", err);
    process.exit(1);
  });

  let seenTweetIds = new Set<string>();
  let page = 0;
  let cursor: string | undefined = startCursor;
  let totalFetched = 0;
  let totalWritten = 0;

  try {
    while (true) {
      page += 1;
      const response = await fetchPage(apiKey, userId, kind, cursor);

      const tweets = response.tweets ?? [];
      totalFetched += tweets.length;

      let wroteThisPage = 0;
      for (const tweet of tweets) {
        const id = asString(tweet.id_str ?? tweet.id);
        if (!id) continue;
        if (seenTweetIds.has(id)) continue;
        seenTweetIds.add(id);
        writeStream.write(JSON.stringify(tweet) + "\n");
        wroteThisPage += 1;
      }
      totalWritten += wroteThisPage;

      const hasNext = Boolean(response.next_cursor);
      console.log(
        `page=${page} fetched=${tweets.length} wrote=${wroteThisPage} next_cursor=${hasNext}`
      );

      if (!hasNext) break;
      if (maxPages > 0 && page >= maxPages) break;

      cursor = response.next_cursor ?? undefined;
    }
  } finally {
    writeStream.end();
  }

  console.log(
    `Done. pages=${page} fetched=${totalFetched} unique_written=${totalWritten} file=${outPath}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

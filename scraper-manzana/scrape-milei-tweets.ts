#!/usr/bin/env bun
import { z } from "zod";
import { fetch } from "undici";

const SOCIALDATA_API_KEY = process.env.SOCIALDATA_API_KEY;
if (!SOCIALDATA_API_KEY) {
  console.error("Error: SOCIALDATA_API_KEY environment variable is not set");
  process.exit(1);
}

// Import types and conversion function from existing code
import {
  type SocialDataBaseTweet,
  SocialDataErrorResponse,
  SocialDataTweet,
  SocialDataTweetsResponse,
} from "./socialdata/schemas.ts";
import { intoTwitterScraperTweet } from "./socialdata/scraper.ts";

async function get(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SOCIALDATA_API_KEY}`,
      Accept: "application/json",
    },
  });
  const json = await response.json();
  if (json.status === "error") {
    throw new Error(json.message);
  }
  return json;
}

async function* searchTweets(query: string) {
  let cursor: string | undefined;

  while (true) {
    const url = new URL("https://api.socialdata.tools/twitter/search");
    url.searchParams.set("query", query);
    if (cursor) url.searchParams.set("cursor", cursor);
    url.searchParams.set("type", "Latest");

    const response = await get(url.toString());
    const parsed = z
      .union([SocialDataTweetsResponse, SocialDataErrorResponse])
      .safeParse(response);

    if (!parsed.success) {
      console.error(response);
      throw parsed.error;
    }

    if ("status" in parsed.data) {
      throw new Error(JSON.stringify(parsed.data));
    }

    yield parsed.data.tweets.map(intoTwitterScraperTweet);

    cursor = parsed.data.next_cursor;
    if (!cursor) break;
  }
}

async function main() {
  const startDate = "2024-06-01";
  const endDate = "2024-10-15";
  const query = `from:jmilei since:${startDate} until:${endDate}`;

  try {
    for await (const tweets of searchTweets(query)) {
      for (const tweet of tweets) {
        // Output each tweet as JSONL
        console.log(JSON.stringify(tweet));
      }
    }
  } catch (error) {
    console.error("Error fetching tweets:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

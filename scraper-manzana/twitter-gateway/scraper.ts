import type { Scrap } from "api/schema.ts";
import { scrapNewTweetsFromApi } from "../socialdata/scraper.ts";
import { z } from "zod";

const MILEI_USER_ID = "4020276615";
const SNAPSHOT_SIZE = 40;

const gatewayTweet = z
  .object({
    tweet_created_at: z.string(),
    id_str: z.string(),
    full_text: z.string(),
    favorite_count: z.number(),
    views_count: z.number().nullable(),
    retweeted_status: z.unknown().nullable(),
  })
  .passthrough();
const timelineResponse = z.object({
  next_cursor: z.string().nullable(),
  tweets: z.array(gatewayTweet),
});
type SnapshotTweet = {
  tweet_created_at: string;
  id_str: string;
  full_text: string;
  favorite_count: number;
  views_count: number | null;
  retweeted_status: null;
  [key: string]: unknown;
};

async function fetchTweetSnapshot(apiKey: string, baseUrl: string) {
  const tweets: SnapshotTweet[] = [];
  const seenIds = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  while (tweets.length < SNAPSHOT_SIZE) {
    const url = new URL(
      `${baseUrl}/twitter/user/${MILEI_USER_ID}/tweets-and-replies`,
    );
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(
        `Twitter gateway snapshot failed: ${response.status} ${await response.text()}`,
      );
    }
    const page = timelineResponse.parse(await response.json());
    for (const tweet of page.tweets) {
      if (tweet.retweeted_status !== null || seenIds.has(tweet.id_str))
        continue;
      seenIds.add(tweet.id_str);
      tweets.push({
        ...tweet,
        tweet_created_at: tweet.tweet_created_at,
        id_str: tweet.id_str,
        full_text: tweet.full_text,
        favorite_count: tweet.favorite_count,
        views_count: tweet.views_count,
        retweeted_status: null,
      });
      if (tweets.length === SNAPSHOT_SIZE) break;
    }
    if (!page.next_cursor || seenCursors.has(page.next_cursor)) break;
    seenCursors.add(page.next_cursor);
    cursor = page.next_cursor;
  }

  if (tweets.length < SNAPSHOT_SIZE) {
    throw new Error(
      `Twitter gateway snapshot returned only ${tweets.length} non-retweets`,
    );
  }
  return {
    capturedAt: new Date(),
    source: "twitter-gateway" as const,
    tweets,
  };
}

export async function scrapNewTweets(lastTweetIds?: string[]): Promise<Scrap> {
  const apiKey = process.env.TWITTER_GATEWAY_API_KEY;
  if (!apiKey) throw new Error("TWITTER_GATEWAY_API_KEY is not set");

  const baseUrl = (
    process.env.TWITTER_GATEWAY_URL ?? "https://docial.nulo.lol"
  ).replace(/\/$/, "");

  const [scrap, tweetSnapshot] = await Promise.all([
    scrapNewTweetsFromApi(
      {
        apiKey,
        baseUrl,
        name: "Twitter gateway",
        userIdOrHandle: MILEI_USER_ID,
      },
      lastTweetIds,
    ),
    fetchTweetSnapshot(apiKey, baseUrl),
  ]);
  return { ...scrap, tweetSnapshot };
}

import type { Scrap } from "api/schema.ts";
import { scrapNewTweetsFromApi } from "../socialdata/scraper.ts";

const MILEI_USER_ID = "4020276615";

export async function scrapNewTweets(
  lastTweetIds?: string[],
): Promise<Scrap> {
  const apiKey = process.env.TWITTER_GATEWAY_API_KEY;
  if (!apiKey) throw new Error("TWITTER_GATEWAY_API_KEY is not set");

  return await scrapNewTweetsFromApi(
    {
      apiKey,
      baseUrl: (
        process.env.TWITTER_GATEWAY_URL ?? "https://docial.nulo.lol"
      ).replace(/\/$/, ""),
      name: "Twitter gateway",
      userIdOrHandle: MILEI_USER_ID,
    },
    lastTweetIds,
  );
}

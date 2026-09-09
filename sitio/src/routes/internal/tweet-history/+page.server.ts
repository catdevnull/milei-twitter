import { db } from "$lib/db";
import { asc, desc, eq } from "drizzle-orm";
import { tweetSnapshots } from "../../../schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const latestRows = await db
    .selectDistinctOn([tweetSnapshots.tweetId], {
      tweetId: tweetSnapshots.tweetId,
      tweetedAt: tweetSnapshots.tweetedAt,
      scrapedAt: tweetSnapshots.scrapedAt,
      favoriteCount: tweetSnapshots.favoriteCount,
      viewsCount: tweetSnapshots.viewsCount,
      tweetJson: tweetSnapshots.tweetJson,
    })
    .from(tweetSnapshots)
    .orderBy(tweetSnapshots.tweetId, desc(tweetSnapshots.scrapedAt));

  const tweets = latestRows
    .map((row) => ({
      ...row,
      text:
        typeof (row.tweetJson as { full_text?: unknown })?.full_text ===
        "string"
          ? (row.tweetJson as { full_text: string }).full_text
          : "",
    }))
    .sort(
      (left, right) => right.tweetedAt.getTime() - left.tweetedAt.getTime(),
    );
  const requestedTweetId = url.searchParams.get("tweet");
  const selectedTweetId = tweets.some(
    (tweet) => tweet.tweetId === requestedTweetId,
  )
    ? requestedTweetId!
    : tweets[0]?.tweetId;
  const history = selectedTweetId
    ? await db
        .select({
          scrapedAt: tweetSnapshots.scrapedAt,
          favoriteCount: tweetSnapshots.favoriteCount,
          viewsCount: tweetSnapshots.viewsCount,
        })
        .from(tweetSnapshots)
        .where(eq(tweetSnapshots.tweetId, selectedTweetId))
        .orderBy(asc(tweetSnapshots.scrapedAt))
    : [];

  return { tweets, selectedTweetId, history };
};

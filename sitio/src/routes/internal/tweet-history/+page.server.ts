import { db } from "$lib/db";
import { classifyLikeDrops } from "$lib/data-processing/likeDrops";
import { asc, desc, eq, sql } from "drizzle-orm";
import { tweetSnapshots } from "../../../schema";
import type { PageServerLoad } from "./$types";
import { getMockTweetHistory } from "./mock";

export const load: PageServerLoad = async ({ url }) => {
  const requestedTweetId = url.searchParams.get("tweet");
  if (url.searchParams.get("mock") === "1") {
    return getMockTweetHistory(requestedTweetId);
  }

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

  const dropRows = await db.execute<{
    tweetId: string;
    dropEvents: number;
    totalLikesLost: number;
    maxSingleDrop: number;
    maxSingleDropRate: number;
  }>(sql`
    with changes as (
      select
        ${tweetSnapshots.tweetId} as tweet_id,
        ${tweetSnapshots.favoriteCount} as favorite_count,
        lag(${tweetSnapshots.favoriteCount}) over (
          partition by ${tweetSnapshots.tweetId}
          order by ${tweetSnapshots.scrapedAt}
        ) as previous_favorite_count
      from ${tweetSnapshots}
    )
    select
      tweet_id as "tweetId",
      count(*) filter (
        where favorite_count < previous_favorite_count
      )::int as "dropEvents",
      coalesce(sum(greatest(previous_favorite_count - favorite_count, 0)), 0)::float8
        as "totalLikesLost",
      coalesce(max(greatest(previous_favorite_count - favorite_count, 0)), 0)::float8
        as "maxSingleDrop",
      coalesce(max(
        case
          when favorite_count < previous_favorite_count and previous_favorite_count > 0
            then (previous_favorite_count - favorite_count)::float8 / previous_favorite_count
          else 0
        end
      ), 0)::float8 as "maxSingleDropRate"
    from changes
    group by tweet_id
  `);
  const dropsByTweetId = new Map(
    dropRows.map(({ tweetId, ...stats }) => [
      tweetId,
      classifyLikeDrops(stats),
    ]),
  );

  const tweets = latestRows
    .map((row) => ({
      ...row,
      text:
        typeof (row.tweetJson as { full_text?: unknown })?.full_text ===
        "string"
          ? (row.tweetJson as { full_text: string }).full_text
          : "",
      likeDrops:
        dropsByTweetId.get(row.tweetId) ??
        classifyLikeDrops({
          dropEvents: 0,
          totalLikesLost: 0,
          maxSingleDrop: 0,
          maxSingleDropRate: 0,
        }),
    }))
    .sort(
      (left, right) => right.tweetedAt.getTime() - left.tweetedAt.getTime(),
    );
  const selectedTweetId = tweets.some(
    (tweet) => tweet.tweetId === requestedTweetId,
  )
    ? requestedTweetId!
    : tweets[0]?.tweetId;
  const rawHistory = selectedTweetId
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
  const history = rawHistory.map((observation, index) => ({
    ...observation,
    likeDelta:
      index === 0
        ? null
        : observation.favoriteCount - rawHistory[index - 1].favoriteCount,
  }));

  return { tweets, selectedTweetId, history, isMock: false };
};

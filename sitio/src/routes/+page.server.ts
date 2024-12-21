import { db } from "$lib/db";
import { and, asc, desc, gte, isNotNull, lt, lte, sql } from "drizzle-orm";
import * as schema from "../schema";
import type { PageServerLoad } from "./$types";
import { dayjs, likesCutoffSql } from "$lib/consts";
import { error, redirect } from "@sveltejs/kit";
import { getLastWeek } from "$lib/data-processing/weekly";
import { getStatsForDaysInTimePeriod } from "@/data-processing/days";

const tz = "America/Argentina/Buenos_Aires";

function getStartingFrom(query: string) {
  switch (query) {
    case "last-24h":
      return dayjs().subtract(23, "hour");
    default:
      if (!query.startsWith("date:")) error(400, "Query imposible");
      try {
        const dateStr = query.slice(5);
        const date = dayjs(dateStr, "YYYY-MM-DD").tz(tz, true);
        return date;
      } catch {
        error(400, "Query imposible");
      }
  }
}

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  const query =
    url.searchParams.get("q") ?? "date:" + dayjs().tz(tz).format("YYYY-MM-DD");
  const startingFrom = getStartingFrom(query);
  const endsAt = startingFrom.add(24, "hour");

  const t0 = performance.now();
  const [
    likedTweets,
    retweets,
    tweets,
    lastUpdated,
    firstLikedTweet,
    monthData,
    hasNextMonth,
  ] = await Promise.all([
    db.query.likedTweets.findMany({
      columns: {
        firstSeenAt: true,
        url: true,
      },
      where: and(
        gte(schema.likedTweets.firstSeenAt, startingFrom.toDate()),
        lt(schema.likedTweets.firstSeenAt, endsAt.toDate()),
        likesCutoffSql,
      ),
      orderBy: desc(schema.likedTweets.firstSeenAt),
    }),
    db.query.retweets.findMany({
      columns: {
        retweetAt: true,
        posterId: true,
        postId: true,
        posterHandle: true,
      },
      where: and(
        gte(schema.retweets.retweetAt, startingFrom.toDate()),
        lt(schema.retweets.retweetAt, endsAt.toDate()),
      ),
      orderBy: desc(schema.retweets.retweetAt),
    }),
    db.query.tweets.findMany({
      columns: {},
      extras: {
        timestamp:
          sql<number>`json_extract(${schema.tweets.twitterScraperJson}, '$.timestamp')`.as(
            "timestamp",
          ),
        isRetweet:
          sql<boolean>`json_extract(${schema.tweets.twitterScraperJson}, '$.isRetweet')`.as(
            "isRetweet",
          ),
      },
      where: and(
        gte(
          sql`json_extract(${schema.tweets.twitterScraperJson}, '$.timestamp')`,
          +startingFrom / 1000,
        ),
        lt(
          sql`json_extract(${schema.tweets.twitterScraperJson}, '$.timestamp')`,
          +endsAt / 1000,
        ),
      ),
      orderBy: desc(
        sql`json_extract(${schema.tweets.twitterScraperJson}, '$.timestamp')`,
      ),
    }),
    db.query.scraps.findFirst({
      orderBy: desc(schema.scraps.finishedAt),
      where: isNotNull(schema.scraps.totalTweetsSeen),
    }),

    db.query.likedTweets.findFirst({
      orderBy: asc(schema.likedTweets.firstSeenAt),
      where: likesCutoffSql,
    }),
    getStatsForDaysInTimePeriod(
      db,
      startingFrom.startOf("month"),
      startingFrom.endOf("month"),
    ),
    db.query.retweets.findFirst({
      where: gte(
        schema.retweets.retweetAt,
        startingFrom.add(1, "month").startOf("month").toDate(),
      ),
    }),
  ]);
  const t1 = performance.now();
  console.log("queries", t1 - t0);

  if (
    likedTweets.length === 0 &&
    retweets.length === 0 &&
    tweets.length === 0 &&
    !url.searchParams.get("q")
  ) {
    return redirect(
      302,
      "/?q=date:" + dayjs().subtract(1, "day").tz(tz).format("YYYY-MM-DD"),
    );
  }

  setHeaders({
    "cache-control": "public, max-age=60",
  });

  return {
    likedTweets,
    retweets,
    tweets: tweets.map((t) => ({
      ...t,
      timestamp: new Date(t.timestamp * 1000),
    })),
    lastUpdated,
    start: startingFrom.toDate(),
    firstLikedTweet,
    monthData,
    hasNextMonth: !!hasNextMonth,
    query,
  };
};

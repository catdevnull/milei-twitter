import { db } from "$lib/db";
import { and, asc, desc, gte, isNotNull, lt, lte, sql } from "drizzle-orm";
import * as schema from "../schema";
import type { PageServerLoad } from "./$types";
import { dayjs, likesCutoffSql } from "$lib/consts";
import { error, redirect } from "@sveltejs/kit";
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

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const query =
    url.searchParams.get("q") ?? "date:" + dayjs().tz(tz).format("YYYY-MM-DD");
  const startingFrom = getStartingFrom(query);
  const endsAt = startingFrom.add(24, "hour");

  const heatmapStart = dayjs().tz(tz).subtract(90, "day").startOf("day");
  const heatmapEnd = dayjs().tz(tz).endOf("day");

  const t0 = performance.now();
  const [
    likedTweets,
    retweets,
    tweets,
    lastUpdated,
    firstLikedTweet,
    monthData,
    hasNextMonth,
    heatLikes,
    heatRetweets,
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
          sql<number>`(${schema.tweets.twitterScraperJson}->>'timestamp')::numeric`.as(
            "timestamp",
          ),
        isRetweet:
          sql<boolean>`(${schema.tweets.twitterScraperJson}->>'isRetweet')::boolean`.as(
            "isRetweet",
          ),
      },
      where: and(
        gte(
          sql`(${schema.tweets.twitterScraperJson}->>'timestamp')::numeric`,
          +startingFrom / 1000,
        ),
        lt(
          sql`(${schema.tweets.twitterScraperJson}->>'timestamp')::numeric`,
          +endsAt / 1000,
        ),
      ),
      orderBy: desc(
        sql`(${schema.tweets.twitterScraperJson}->>'timestamp')::numeric`,
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
    db.query.likedTweets.findMany({
      columns: { firstSeenAt: true },
      where: and(
        gte(schema.likedTweets.firstSeenAt, heatmapStart.toDate()),
        lte(schema.likedTweets.firstSeenAt, heatmapEnd.toDate()),
        likesCutoffSql,
      ),
      orderBy: desc(schema.likedTweets.firstSeenAt),
    }),
    db.query.retweets.findMany({
      columns: { retweetAt: true },
      where: and(
        gte(schema.retweets.retweetAt, heatmapStart.toDate()),
        lte(schema.retweets.retweetAt, heatmapEnd.toDate()),
      ),
      orderBy: desc(schema.retweets.retweetAt),
    }),
  ]);
  const t1 = performance.now();
  console.log("queries", t1 - t0);

  console.time("heatmap");
  const hourHeatmap: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0),
  );
  const addToHeat = (d: Date) => {
    // Assume fixed UTC-3 (America/Argentina/Buenos_Aires without DST)
    const utcHour = d.getUTCHours();
    let hour = utcHour - 3;
    let dow = d.getUTCDay(); // 0 = Sunday
    if (hour < 0) {
      hour += 24;
      dow = (dow + 6) % 7; // previous day
    } else if (hour >= 24) {
      hour -= 24;
      dow = (dow + 1) % 7; // next day (not expected with -3 but kept generic)
    }
    hourHeatmap[dow][hour]++;
  };
  heatLikes.forEach((t: { firstSeenAt: Date }) => addToHeat(t.firstSeenAt));
  heatRetweets.forEach((t: { retweetAt: Date }) => addToHeat(t.retweetAt));
  console.timeEnd("heatmap");

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
    hourHeatmap,
  };
};

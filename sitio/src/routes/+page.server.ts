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

// The weekday/hour heatmap covers the last 90 days and doesn't depend on the
// selected day, so compute it at most every few minutes instead of on every
// navigation (it reads ~12k tweet rows).
const HEATMAP_TTL_MS = 5 * 60 * 1000;
let heatmapCache: { computedAt: number; value: Promise<number[][]> } | null =
  null;

function getHourHeatmap(): Promise<number[][]> {
  if (heatmapCache && Date.now() - heatmapCache.computedAt < HEATMAP_TTL_MS) {
    return heatmapCache.value;
  }
  const value = computeHourHeatmap();
  heatmapCache = { computedAt: Date.now(), value };
  value.catch(() => {
    if (heatmapCache?.value === value) heatmapCache = null;
  });
  return value;
}

async function computeHourHeatmap(): Promise<number[][]> {
  const heatmapStart = dayjs().tz(tz).subtract(90, "day").startOf("day");
  const heatmapEnd = dayjs().tz(tz).endOf("day");
  const timestamp = sql<number>`(${schema.tweets.twitterScraperJson}->>'timestamp')::numeric`;
  const heatTweets = await db
    .select({ timestamp })
    .from(schema.tweets)
    .where(
      and(
        gte(timestamp, +heatmapStart / 1000),
        lte(timestamp, +heatmapEnd / 1000),
      ),
    );

  const hourHeatmap: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0),
  );
  for (const t of heatTweets) {
    const d = new Date(Number(t.timestamp) * 1000);
    // Assume fixed UTC-3 (America/Argentina/Buenos_Aires without DST)
    let hour = d.getUTCHours() - 3;
    let dow = d.getUTCDay(); // 0 = Sunday
    if (hour < 0) {
      hour += 24;
      dow = (dow + 6) % 7; // previous day
    }
    hourHeatmap[dow][hour]++;
  }
  return hourHeatmap;
}

export const load: PageServerLoad = async ({ url, setHeaders }) => {
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
    hourHeatmap,
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
    getHourHeatmap(),
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
    hourHeatmap,
  };
};

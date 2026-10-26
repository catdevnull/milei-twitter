import { sql } from "drizzle-orm";
import { dayjs, likesCutoffSql, tz } from "$lib/consts";
import { likedTweets, retweets, tweets } from "../../schema";
import { db } from "$lib/db";

// Earlier likes do not have reliable timestamps (see the warning on the home page).
export const inactivityStart = new Date("2024-02-12T00:00:00-03:00");

function inactivityGapsQuery(
  observedUntil: Date,
  startingFrom = inactivityStart,
) {
  const start = new Date(Math.max(+inactivityStart, +startingFrom));
  return sql`
    WITH activity AS (
      SELECT ${likedTweets.firstSeenAt} AS at
      FROM ${likedTweets}
      WHERE ${likesCutoffSql ?? sql`true`}
      UNION
      SELECT ${retweets.retweetAt} AS at FROM ${retweets}
      UNION
      SELECT to_timestamp((${tweets.twitterScraperJson}->>'timestamp')::numeric) AS at
      FROM ${tweets}
    ), gaps AS (
      SELECT lag(at) OVER (ORDER BY at) AS start, at AS end
      FROM activity
      WHERE at >= ${start.toISOString()}::timestamptz
        AND at <= ${observedUntil.toISOString()}::timestamptz
    )
  `;
}

export function inactivityRankingQuery(
  observedUntil: Date,
  startingFrom = inactivityStart,
  limit = 10,
  offset = 0,
) {
  return sql`${inactivityGapsQuery(observedUntil, startingFrom)}
    SELECT start, "end", extract(epoch FROM ("end" - start)) * 1000 AS "durationMs"
    FROM gaps
    WHERE start IS NOT NULL AND "end" > start
    ORDER BY "durationMs" DESC, start ASC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

export function weeklyInactivityQuery(
  observedUntil: Date,
  startingFrom = inactivityStart,
) {
  return sql`${inactivityGapsQuery(observedUntil, startingFrom)}
    SELECT to_char(date_trunc('week', start AT TIME ZONE ${tz}), 'YYYY-MM-DD') AS week,
      avg(extract(epoch FROM ("end" - start)) * 1000) AS "meanMs",
      percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM ("end" - start)) * 1000) AS "medianMs",
      count(*)::integer AS count
    FROM gaps
    WHERE start IS NOT NULL AND "end" > start
    GROUP BY week
    ORDER BY week
  `;
}

export type WeeklyInactivity = {
  week: string;
  meanMs: number | null;
  medianMs: number | null;
  count: number;
  partial: boolean;
};

export async function getWeeklyInactivity(
  observedUntil: Date,
  startingFrom = inactivityStart,
): Promise<WeeklyInactivity[]> {
  const rows = await db.execute<{
    week: string;
    meanMs: string;
    medianMs: number;
    count: number;
  }>(weeklyInactivityQuery(observedUntil, startingFrom));
  const byWeek = new Map(rows.map((row) => [row.week, row]));
  const first = dayjs(Math.max(+startingFrom, +inactivityStart)).tz(tz);
  const last = dayjs(observedUntil).tz(tz);
  const result: WeeklyInactivity[] = [];
  for (
    let week = first.subtract((first.day() + 6) % 7, "day").startOf("day");
    !week.isAfter(last);
    week = week.add(7, "day")
  ) {
    const key = week.format("YYYY-MM-DD");
    const row = byWeek.get(key);
    result.push({
      week: key,
      meanMs: row ? Number(row.meanMs) : null,
      medianMs: row ? Number(row.medianMs) : null,
      count: row ? Number(row.count) : 0,
      partial:
        week.isBefore(first) ||
        week.add(7, "day").subtract(1, "millisecond").isAfter(last),
    });
  }
  return result;
}

export async function getInactivityRanking(
  observedUntil: Date,
  startingFrom = inactivityStart,
  limit = 10,
  offset = 0,
) {
  const rows = await db.execute<{
    start: string;
    end: string;
    durationMs: string;
  }>(inactivityRankingQuery(observedUntil, startingFrom, limit, offset));

  return rows.map((row) => ({
    start: new Date(row.start),
    end: new Date(row.end),
    durationMs: Number(row.durationMs),
  }));
}

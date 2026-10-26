import { sql } from "drizzle-orm";
import { likesCutoffSql } from "$lib/consts";
import { likedTweets, retweets, tweets } from "../../schema";
import { db } from "$lib/db";

// Earlier likes do not have reliable timestamps (see the warning on the home page).
export const inactivityStart = new Date("2024-02-12T00:00:00-03:00");

export function inactivityRankingQuery(observedUntil: Date) {
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
      WHERE at >= ${inactivityStart.toISOString()}::timestamptz
        AND at <= ${observedUntil.toISOString()}::timestamptz
    )
    SELECT start, "end", extract(epoch FROM ("end" - start)) * 1000 AS "durationMs"
    FROM gaps
    WHERE start IS NOT NULL AND "end" > start
    ORDER BY "durationMs" DESC, start ASC
    LIMIT 10
  `;
}

export async function getInactivityRanking(observedUntil: Date) {
  const rows = await db.execute<{
    start: string;
    end: string;
    durationMs: string;
  }>(inactivityRankingQuery(observedUntil));

  return rows.map((row) => ({
    start: new Date(row.start),
    end: new Date(row.end),
    durationMs: Number(row.durationMs),
  }));
}

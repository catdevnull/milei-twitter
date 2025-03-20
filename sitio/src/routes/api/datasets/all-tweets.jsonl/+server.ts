import { db } from "$lib/db";
import { and, desc, lt, sql } from "drizzle-orm";
import { retweets, tweets } from "../../../../schema";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url }) => {
  console.time("all-tweets-jsonl");

  // Get limit parameter from URL query
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  const BATCH_SIZE = 100;
  let lastId: string | null = null;
  let allRecords: (typeof tweets.$inferSelect)[] = [];
  let recordCount = 0;

  // workaround because libsql sucks and returns "LibsqlError: RESPONSE_TOO_LARGE: Response is too large"
  while (true) {
    const batch: (typeof tweets.$inferSelect)[] =
      await db.query.tweets.findMany({
        orderBy: desc(tweets.id),
        limit: BATCH_SIZE,
        where: and(lastId ? lt(tweets.id, lastId) : undefined),
      });

    if (batch.length === 0) break;

    // If we have a limit, only add up to that limit
    if (limit && recordCount + batch.length > limit) {
      allRecords = allRecords.concat(batch.slice(0, limit - recordCount));
      break;
    } else {
      allRecords = allRecords.concat(batch);
      recordCount += batch.length;
    }

    lastId = batch[batch.length - 1].id;

    if (batch.length < BATCH_SIZE) break;

    // If we've reached the requested limit, stop fetching
    if (limit && recordCount >= limit) break;
  }

  const records = allRecords.map((row) => ({
    ...(row.twitterScraperJson as any),
    capturedAt: row.capturedAt.toISOString(),
  }));

  console.timeEnd("all-tweets-jsonl");

  const filename = limit
    ? `last-${limit}-tweets-milei.nulo.lol-${new Date().toISOString()}.jsonl`
    : `all-tweets-milei.nulo.lol-${new Date().toISOString()}.jsonl`;

  return new Response(
    records.map((record) => JSON.stringify(record)).join("\n"),
    {
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename=${filename}`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
};

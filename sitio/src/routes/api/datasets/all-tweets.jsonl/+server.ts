import { db } from "$lib/db";
import { and, desc, lt, sql } from "drizzle-orm";
import { retweets, tweets } from "../../../../schema";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
  console.time("all-tweets-jsonl");

  const BATCH_SIZE = 1000;
  let lastId: string | null = null;
  let allRecords: (typeof tweets.$inferSelect)[] = [];
  // workaround because libsql sucks and returns "LibsqlError: RESPONSE_TOO_LARGE: Response is too large"
  while (true) {
    const batch: (typeof tweets.$inferSelect)[] =
      await db.query.tweets.findMany({
        orderBy: desc(tweets.id),
        limit: BATCH_SIZE,
        where: and(lastId ? lt(tweets.id, lastId) : undefined),
      });

    if (batch.length === 0) break;

    allRecords = allRecords.concat(batch);
    lastId = batch[batch.length - 1].id;

    if (batch.length < BATCH_SIZE) break;
  }

  const records = allRecords.map((row) => ({
    ...(row.twitterScraperJson as any),
    capturedAt: row.capturedAt.toISOString(),
  }));

  console.timeEnd("all-tweets-jsonl");

  return new Response(
    records.map((record) => JSON.stringify(record)).join("\n"),
    {
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename=all-tweets-milei.nulo.lol-${new Date().toISOString()}.jsonl`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
};

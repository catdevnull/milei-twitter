import { db } from "$lib/db";
import { desc, lt } from "drizzle-orm";
import { retweets } from "../../../../schema";
import { stringify } from "csv-stringify/sync";

export async function GET() {
  console.time("retweets-csv");

  const BATCH_SIZE = 1000;
  let lastRetweetAt: Date | null = null;
  let allRecords: (typeof retweets.$inferSelect)[] = [];

  // workaround because libsql sucks and returns "LibsqlError: RESPONSE_TOO_LARGE: Response is too large"
  while (true) {
    const batch: (typeof retweets.$inferSelect)[] =
      await db.query.retweets.findMany({
        orderBy: desc(retweets.retweetAt),
        limit: BATCH_SIZE,
        where: lastRetweetAt
          ? lt(retweets.retweetAt, lastRetweetAt)
          : undefined,
      });

    if (batch.length === 0) break;

    allRecords = allRecords.concat(batch);
    lastRetweetAt = batch[batch.length - 1].retweetAt;

    if (batch.length < BATCH_SIZE) break;
  }

  const records = allRecords.map((row) => [
    row.retweetAt.toISOString(),
    row.postedAt.toISOString(),
    row.posterId,
    row.posterHandle,
    row.postId,
    row.text,
  ]);

  const csv = stringify(records, {
    header: true,
    columns: [
      "retweetAt",
      "postedAt",
      "posterId",
      "posterHandle",
      "postId",
      "textPreview",
    ],
  });

  console.timeEnd("retweets-csv");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=retweets-milei.nulo.in-${new Date().toISOString()}.csv`,
    },
  });
}

import { db } from "$lib/db";
import { desc } from "drizzle-orm";
import { retweets } from "../../../../schema";
import { stringify } from "csv-stringify/sync";

export async function GET() {
  console.time("retweets-csv");

  const retweetsData = await db.query.retweets.findMany({
    orderBy: desc(retweets.retweetAt),
  });

  const records = retweetsData.map((row) => [
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

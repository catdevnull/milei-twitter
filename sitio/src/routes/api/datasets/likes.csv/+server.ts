import { db } from "$lib/db";
import { desc } from "drizzle-orm";
import { likedTweets } from "../../../../schema";
import { stringify } from "csv-stringify/sync";
import { likesCutoffSql } from "$lib/consts";

export async function GET() {
  console.time("liked-tweets-csv");

  const likedTweetsData = await db.query.likedTweets.findMany({
    columns: {
      firstSeenAt: true,
      url: true,
    },
    where: likesCutoffSql,
    orderBy: desc(likedTweets.firstSeenAt),
  });

  const records = likedTweetsData.map((row) => [
    row.firstSeenAt.toISOString(),
    row.url,
  ]);

  const csv = stringify(records, {
    header: true,
    columns: ["firstSeenAt", "url"],
  });

  console.timeEnd("liked-tweets-csv");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=liked-tweets-milei.nulo.lol-${new Date().toISOString()}.csv`,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

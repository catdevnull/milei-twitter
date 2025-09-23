import { parsearLinkDeTwitter } from "$lib/consts";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { brotliDecompress } from "node:zlib";
import * as schema from "../../schema";
import { toDate } from "date-fns-tz";
import type { db as dbGlobal } from ".";

const brotliDecompressP = promisify(brotliDecompress);

export async function seedHistoricLikes(db: typeof dbGlobal) {
  console.time("seedHistoricLikes");
  const compressed = await readFile("src/lib/db/historicLikes/likes.tsv.br");
  const dataset = await brotliDecompressP(compressed);
  for (const line of dataset.toString().split("\r\n").slice(1)) {
    const [url, tweet_timestamp, , estimated_like_timestamp] = line.split("\t");
    const parseado = parsearLinkDeTwitter(url);
    if (!parseado || !("id" in parseado))
      throw `no se pudo parsear linea '${line}'`;
    const values: typeof schema.historicLikedTweets.$inferInsert = {
      postId: parseado.id,
      url,
      postedAt: new Date(tweet_timestamp),
      estimatedLikedAt: toDate(
        `${estimated_like_timestamp.replace(/\s/, "T")}-03:00`,
      ),
    };
    await db
      .insert(schema.historicLikedTweets)
      .values(values)
      .onConflictDoNothing();
  }
  console.timeEnd("seedHistoricLikes");
}

// await seedHistoricLikes(
//   await connectDb({
//     url: process.env.DATABASE_URL!,
//   }),
// );

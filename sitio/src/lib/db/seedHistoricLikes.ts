import { dayjs, parsearLinkDeTwitter, tz } from "$lib/consts";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { brotliDecompress } from "node:zlib";
import type { connectDb } from "./connectDb";
import * as schema from "../../schema";
import { parse } from "date-fns";

const brotliDecompressP = promisify(brotliDecompress);

export async function seedHistoricLikes(
  db: Awaited<ReturnType<typeof connectDb>>,
) {
  console.time("seedHistoricLikes");
  const compressed = await readFile("src/lib/db/historicLikes/likes.tsv.br");
  const dataset = await brotliDecompressP(compressed);
  await db.transaction(async (tx) => {
    for (const line of dataset.toString().split("\r\n").slice(1)) {
      const [url, tweet_timestamp, , estimated_like_timestamp] =
        line.split("\t");
      const parseado = parsearLinkDeTwitter(url);
      if (!parseado || !("id" in parseado))
        throw `no se pudo parsear linea '${line}'`;
      const values: typeof schema.historicLikedTweets.$inferInsert = {
        postId: parseado.id,
        url,
        postedAt: new Date(tweet_timestamp),
        estimatedLikedAt: dayjs(
          estimated_like_timestamp,
          // 2023-11-29 12:59:46
          "YYYY-MM-DD HH:mm:ss",
        )
          .tz(tz, true)
          .toDate(),
      };
      await tx
        .insert(schema.historicLikedTweets)
        .values(values)
        .onConflictDoNothing();
    }
  });
  console.timeEnd("seedHistoricLikes");
}

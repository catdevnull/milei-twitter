import { db } from "$lib/db.js";
import { error, json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import {
  likedTweets,
  retweets,
  scraperTokens,
  scraps,
  zTokenAccountData,
} from "../../../../../schema.js";
import { zScrap } from "api/schema.js";

export async function POST({ url, request }) {
  {
    let authHeader = request.headers.get("Authorization");
    const token = authHeader?.slice("Bearer ".length) || null;
    if (!token) error(401, "no Bearer token");

    const tokenEntry = await db.query.scraperTokens.findFirst({
      where: eq(scraperTokens.token, token),
    });
    if (!tokenEntry) error(401, "invalid token");
  }

  const json = await request.json();
  const scrapParsed = zScrap.safeParse(json);
  if (!scrapParsed.success) error(400, scrapParsed.error);
  const scrap = scrapParsed.data;

  const scrapId = await db.transaction(async (tx) => {
    const [dbScrap] = await tx
      .insert(scraps)
      .values({
        uid: scrap.uid,
        finishedAt: scrap.finishedAt,
        totalTweetsSeen: scrap.totalTweetsSeen,
      })
      .returning({ id: scraps.id });
    await tx
      .insert(likedTweets)
      .values(scrap.likedTweets.map((t) => ({ ...t, scrapId: dbScrap.id })));
    await tx
      .insert(retweets)
      .values(scrap.retweets.map((t) => ({ ...t, scrapId: dbScrap.id })));
    return dbScrap.id;
  });

  return json({ scrapId });
}

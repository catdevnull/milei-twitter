import { db } from "$lib/db/index.js";
import { error, json } from "@sveltejs/kit";
import { eq, gt } from "drizzle-orm";
import {
  likedTweets,
  retweets,
  scraperTokens,
  scraps,
  tweets,
} from "../../../../../schema.js";
import { zScrap, type PostScrapRes } from "api/schema.js";

export async function POST({ request }: { request: Request }) {
  {
    let authHeader = request.headers.get("Authorization");
    const token = authHeader?.slice("Bearer ".length) || null;
    if (!token) error(401, "no Bearer token");

    const tokenEntry = await db.query.scraperTokens.findFirst({
      where: eq(scraperTokens.token, token),
    });
    if (!tokenEntry) error(401, "invalid token");
  }

  const scrapParsed = zScrap.safeParse(await request.json());
  if (!scrapParsed.success) error(400, scrapParsed.error);
  const scrap = scrapParsed.data;

  const scrapId = await db.transaction(async (tx) => {
    const x = await tx
      .insert(scraps)
      .values({
        uid: scrap.uid,
        finishedAt: scrap.finishedAt,
        totalTweetsSeen: scrap.totalTweetsSeen,
      })
      .returning({ id: scraps.id })
      .onConflictDoNothing({ target: scraps.uid });
    let dbScrap: { id: number };
    if (!x[0]) {
      const y = await tx.query.scraps.findFirst({
        where: eq(scraps.uid, scrap.uid),
      });
      if (!y) throw new Error("wtf");
      dbScrap = y;
    } else {
      dbScrap = x[0];
    }
    for (const likedTweet of scrap.likedTweets ?? []) {
      await tx
        .insert(likedTweets)
        .values({ ...likedTweet, scrapId: dbScrap.id })
        .onConflictDoUpdate({
          target: likedTweets.url,
          set: {
            firstSeenAt: likedTweet.firstSeenAt,
            scrapId: dbScrap.id,
          },
          where: gt(likedTweets.firstSeenAt, likedTweet.firstSeenAt),
        });
      await tx
        .update(likedTweets)
        .set({ lastSeenAt: new Date() })
        .where(eq(likedTweets.url, likedTweet.url));
    }
    for (const retweet of scrap.retweets ?? []) {
      await tx
        .insert(retweets)
        .values({ ...retweet, scrapId: dbScrap.id })
        .onConflictDoUpdate({
          target: [retweets.posterId, retweets.postId],
          set: {
            firstSeenAt: retweet.firstSeenAt,
            scrapId: dbScrap.id,
          },
          where: gt(retweets.firstSeenAt, retweet.firstSeenAt),
        });
    }
    for (const tweet of scrap.tweets ?? []) {
      const values = {
        capturedAt: tweet.capturedAt,
        twitterScraperJson: JSON.parse(tweet.twitterScraperJson),
      };
      await tx
        .insert(tweets)
        .values({
          id: tweet.id,
          ...values,
        })
        .onConflictDoUpdate({
          target: tweets.id,
          set: values,
          where: gt(tweets.capturedAt, tweet.capturedAt),
        });
    }
    return dbScrap.id;
  });

  const res: PostScrapRes = { scrapId };
  return json(res);
}

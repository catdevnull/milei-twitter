import { db } from "$lib/db";
import { and, desc, gt, isNotNull, sql } from "drizzle-orm";
import { likedTweets, retweets, scraps } from "../../../../schema";
import { likesCutoffSql } from "$lib/consts";

export async function GET() {
  const errors: Array<string> = [];
  const lastScrap = await db.query.scraps.findFirst({
    orderBy: desc(scraps.finishedAt),
    where: and(
      isNotNull(scraps.totalTweetsSeen),
      gt(scraps.totalTweetsSeen, 0),
    ),
  });
  // const lastScrapWithLikes = await db
  //   .select({
  //     finishedAt: scraps.finishedAt,
  //     count: sql`(select count(*) from ${likedTweets} where ${scraps.id} = ${likedTweets.scrapId} and ${likesCutoffSql}) as c`,
  //   })
  //   .from(scraps)
  //   .orderBy(desc(scraps.finishedAt))
  //   .groupBy()
  //   .limit(1)
  //   .where(sql`c > 0`);
  const lastScrapWithRetweets = await db
    .select({
      finishedAt: scraps.finishedAt,
      count:
        sql`(select count(*) from ${retweets} where ${scraps.id} = ${retweets.scrapId})`.as(
          "c",
        ),
    })
    .from(scraps)
    .orderBy(desc(scraps.finishedAt))
    .groupBy()
    .limit(1)
    .where(
      sql`(select count(*) from ${retweets} where ${scraps.id} = ${retweets.scrapId}) > 0`,
    );
  // const lastLikedTweet = await db.query.likedTweets.findFirst({
  //   orderBy: desc(likedTweets.lastSeenAt),
  //   where: likesCutoffSql,
  // });

  if (lastScrap) {
    const delta = +new Date() - +lastScrap.finishedAt;
    if (delta > 38 * 60 * 1000) {
      errors.push(`último scrap hace ${delta}ms (>38min)`);
    }
    if (lastScrap.totalTweetsSeen && lastScrap.totalTweetsSeen < 10) {
      errors.push(`solo ${lastScrap.totalTweetsSeen} tweets vistos (<10)`);
    }
  } else errors.push("no hay scraps");
  if (lastScrapWithRetweets && lastScrapWithRetweets.length > 0) {
    const delta = +new Date() - +lastScrapWithRetweets[0].finishedAt;
    if (delta > 12 * 60 * 60 * 1000) {
      errors.push(
        `último scrap con ${lastScrapWithRetweets[0].count} retweets hace ${delta}ms (>12h)`,
      );
    }
  } else errors.push("no hay scraps con likes");
  // if (lastLikedTweet) {
  //   const delta = +new Date() - +(lastLikedTweet.lastSeenAt ?? new Date());
  //   if (delta > 10 * 60 * 1000) {
  //     errors.push(`último tweet visto hace ${delta}ms (>10min)`);
  //   }
  // } else errors.push("no hay ultimo like tweet");

  if (errors.length) {
    return new Response(`errors:\n${errors.map((e) => `- ${e}`).join("\n")}`, {
      status: 500,
    });
  }
  return new Response(`ok (last scrap at ${lastScrap?.finishedAt})`);
}

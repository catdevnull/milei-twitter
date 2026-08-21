import { db } from "$lib/db";
import { and, desc, gt, isNotNull, sql } from "drizzle-orm";
import { likedTweets, retweets, scraps, tweets } from "../../../../schema";
import { likesCutoffSql } from "$lib/consts";

const SCRAPE_INTERVAL_MINUTES = 30;
const MISSED_SCRAPES_BEFORE_FAILURE = 3;
const SCRAPE_GRACE_MINUTES = 8;
const MAX_SCRAP_AGE_MINUTES =
  SCRAPE_INTERVAL_MINUTES * MISSED_SCRAPES_BEFORE_FAILURE +
  SCRAPE_GRACE_MINUTES;
const MAX_NEW_TWEET_AGE_HOURS = 6;
const MILEI_USER_ID = "4020276615";

export async function GET() {
  const errors: Array<string> = [];
  const lastScrap = await db.query.scraps.findFirst({
    orderBy: desc(scraps.finishedAt),
    where: and(
      isNotNull(scraps.totalTweetsSeen),
      gt(scraps.totalTweetsSeen, 0),
    ),
  });
  const lastCapturedTweet = await db.query.tweets.findFirst({
    columns: { capturedAt: true },
    orderBy: desc(tweets.capturedAt),
    where: sql`${tweets.twitterScraperJson}->>'userId' = ${MILEI_USER_ID}`,
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
    if (delta > MAX_SCRAP_AGE_MINUTES * 60 * 1000) {
      errors.push(
        `último scrap hace ${delta}ms (>${MAX_SCRAP_AGE_MINUTES}min)`,
      );
    }
    if (lastScrap.totalTweetsSeen && lastScrap.totalTweetsSeen < 10) {
      errors.push(`solo ${lastScrap.totalTweetsSeen} tweets vistos (<10)`);
    }
  } else errors.push("no hay scraps");
  if (lastCapturedTweet) {
    const delta = +new Date() - +lastCapturedTweet.capturedAt;
    if (delta > MAX_NEW_TWEET_AGE_HOURS * 60 * 60 * 1000) {
      errors.push(
        `último tweet nuevo de Milei hace ${delta}ms (>${MAX_NEW_TWEET_AGE_HOURS}h)`,
      );
    }
  } else errors.push("no hay tweets de Milei");
  if (lastScrapWithRetweets && lastScrapWithRetweets.length > 0) {
    const delta = +new Date() - +lastScrapWithRetweets[0].finishedAt;
    if (delta > 16 * 60 * 60 * 1000) {
      errors.push(
        `último scrap con ${lastScrapWithRetweets[0].count} retweets hace ${delta}ms (>16h)`,
      );
    }
  } else errors.push("no hay scraps con retweets");
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

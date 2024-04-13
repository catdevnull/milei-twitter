// TODO: implementar handleo de rate limits

import { Scraper } from "@catdevnull/twitter-scraper";
import { sessions } from "./dbs/accounts/schema.ts";
import { openAccountsDb } from "./dbs/index.ts";
import { isNull, sql } from "drizzle-orm";
import { Cookie } from "tough-cookie";
import { LikedTweet, Retweet, Scrap } from "api/schema.ts";
import { nanoid } from "nanoid";
import { pushScrap } from "./dbs/scraps/index.ts";

async function getScraper() {
  const accountsDb = await openAccountsDb();
  let session = (
    await accountsDb
      .select()
      .from(sessions)
      .where(isNull(sessions.lastFailedAt))
      .orderBy(sql`random()`)
  )[0];
  if (!session) {
    console.warn(
      "No accounts with no error available, trying to use one with error"
    );
    session = (
      await accountsDb
        .select()
        .from(sessions)
        .orderBy(sql`random()`)
    )[0];
  }
  if (!session) throw new Error(`No account available`);
  const scraper = new Scraper();
  await scraper.setCookies(
    JSON.parse(session.cookiesJson!).map((c: object) => Cookie.fromJSON(c))
  );
  return scraper;
}

export async function printLastLikes() {
  const scraper = await getScraper();
  for await (const likedTweet of scraper.getLikedTweets("jmilei")) {
    console.log(`@${likedTweet.username}: ${likedTweet.text}`);
  }
}

export async function saveLikes() {
  const scraper = await getScraper();

  let likedTweets: Array<LikedTweet> = [];
  for await (const likedTweet of scraper.getLikedTweets("jmilei")) {
    if (!likedTweet.permanentUrl) throw new Error("no permanentUrl");
    if (likedTweet.text === undefined) throw new Error("no text");
    likedTweets.push({
      url: likedTweet.permanentUrl,
      firstSeenAt: new Date(),
      text: likedTweet.text,
    });
  }

  const scrap: Scrap = {
    finishedAt: new Date(),
    likedTweets,
    retweets: [],
    totalTweetsSeen: likedTweets.length,
    uid: nanoid(),
  };
  await pushScrap(scrap);
  return scrap;
}

export async function printLastTweets() {
  const scraper = await getScraper();
  for await (const tweet of scraper.getTweets("jmilei")) {
    console.log(`@${tweet.username}: ${tweet.text}`);
  }
}

export async function saveRetweets() {
  const scraper = await getScraper();

  let totalTweetsSeen = 0;
  let retweets: Array<Retweet> = [];
  for await (const tweet of scraper.getTweets("jmilei")) {
    totalTweetsSeen++;
    if (!tweet.permanentUrl) throw new Error("no permanentUrl");
    if (!tweet.timeParsed) throw new Error("no timeParsed");
    if (tweet.retweetedStatus) {
      if (tweet.retweetedStatus.id === undefined)
        throw new Error("no retweetedStatus.id");
      if (!tweet.retweetedStatus.timeParsed)
        throw new Error("no retweetedStatus.timeParsed");
      if (tweet.retweetedStatus.text === undefined)
        throw new Error("no retweetedStatus.text");
      if (tweet.retweetedStatus.username === undefined)
        throw new Error("no retweetedStatus.username");
      if (tweet.retweetedStatus.userId === undefined)
        throw new Error("no retweetedStatus.userId");
      retweets.push({
        text: tweet.retweetedStatus.text,
        firstSeenAt: new Date(),
        postedAt: tweet.retweetedStatus.timeParsed,
        posterHandle: tweet.retweetedStatus.username,
        posterId: tweet.retweetedStatus.userId,
        postId: tweet.retweetedStatus.id,
        retweetAt: tweet.timeParsed,
      });
    }
    // TODO: subir tweets en formato snscrape
  }

  const scrap: Scrap = {
    finishedAt: new Date(),
    likedTweets: [],
    retweets,
    totalTweetsSeen,
    uid: nanoid(),
  };
  await pushScrap(scrap);
  return scrap;
}

export async function cron() {
  while (true) {
    try {
      const scrap = await saveLikes();
      console.log(`scrapped likes, seen ${scrap.totalTweetsSeen}`);
    } catch (error) {
      console.error(`[error] likedTweets`, error);
    }

    try {
      const scrap = await saveRetweets();
      console.log(`scrapped retweets, seen ${scrap.totalTweetsSeen}`);
    } catch (error) {
      console.error(`[error] retweets`, error);
    }

    await wait(50 * 1000 + Math.random() * 15 * 1000);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

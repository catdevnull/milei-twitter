// TODO: implementar handleo de rate limits

import { Scraper } from "@catdevnull/twitter-scraper";
import { sessions } from "./dbs/accounts/schema.ts";
import { accountsDb } from "./dbs/index.ts";
import { isNull, sql } from "drizzle-orm";
import { Cookie } from "tough-cookie";

async function getScraper() {
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

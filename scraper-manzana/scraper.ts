import { readFile } from "node:fs/promises";
import { Scraper } from "@catdevnull/twitter-scraper";
import { Cookie, CookieJar } from "tough-cookie";
import { LikedTweet, Retweet, Scrap } from "api/schema.ts";
import { nanoid } from "nanoid";
import { pushScrap } from "./dbs/scraps/index.ts";
import { parseAccountList } from "./addAccounts.ts";

async function getScraper() {
  const accountsFilePath = process.env.ACCOUNTS_FILE_PATH;
  if (!accountsFilePath) {
    console.error("Missing $ACCOUNTS_FILE_PATH");
    process.exit(1);
  }
  const accountsFileFormat =
    process.env.ACCOUNTS_FILE_FORMAT ??
    "username:password:email:emailPassword:authToken:twoFactorSecret";

  let cookieJar = new CookieJar();
  let loggedIn = false;

  const fetchWithRandomAccount = async (
    input: string | URL | Request,
    init: RequestInit | undefined
  ): Promise<Response> => {
    if (!loggedIn) {
      const accountsFile = await readFile(accountsFilePath, "utf-8");
      const accounts = parseAccountList(accountsFile, accountsFileFormat);

      // Keep trying to log into accounts unless any don't work
      while (!loggedIn) {
        const account = accounts[Math.floor(Math.random() * accounts.length)];
        try {
          const scraper = new Scraper();
          await scraper.login(
            account.username,
            account.password,
            account.email,
            account.twoFactorSecret
          );
          loggedIn = await scraper.isLoggedIn();
          if (loggedIn) {
            console.info(`Logged into @${account.username}`);
            for (const cookie of await scraper.getCookies()) {
              await cookieJar.setCookie(cookie, "https://twitter.com");
            }
          }
        } catch (error) {
          console.error(`Couldn't login into @${account.username}:`, error);
        }
      }
    }

    const headers = new Headers(init?.headers);
    {
      headers.set("cookie", cookieJar.getCookieStringSync(input.toString()));
      const cookies = await cookieJar.getCookies(input.toString());
      const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
      if (xCsrfToken) {
        headers.set("x-csrf-token", xCsrfToken.value);
      }
    }

    const response = await fetch(input, { ...init, headers });
    {
      const cookie = Cookie.parse(response.headers.get("set-cookie") || "");
      if (cookie) cookieJar.setCookie(cookie, response.url);
    }

    // Rate limit, retry with another account
    if (response.status === 429) {
      cookieJar = new CookieJar();
      loggedIn = false;
      return await fetchWithRandomAccount(input, init);
    }

    return response;
  };

  const scraper = new Scraper({ fetch: fetchWithRandomAccount });
  return scraper;
}

export async function printLastLikes() {
  const scraper = await getScraper();
  for await (const likedTweet of scraper.getLikedTweets("jmilei")) {
    console.log(`@${likedTweet.username}: ${likedTweet.text}`);
  }
}

export async function saveLikes(scraper: Scraper) {
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

export async function saveRetweets(scraper: Scraper) {
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

export async function printFollowing(handle: string, jsonl: boolean) {
  const scraper = await getScraper();
  const id = await scraper.getUserIdByScreenName(handle);
  for await (const profile of scraper.getFollowing(id, 10000)) {
    if (jsonl) {
      console.log(JSON.stringify(profile));
    } else {
      console.log(`@${profile.username}`);
    }
  }
}

export async function cron() {
  const scraper = await getScraper();
  while (true) {
    try {
      const scrap = await saveLikes(scraper);
      console.log(`scrapped likes, seen ${scrap.totalTweetsSeen}`);
    } catch (error) {
      console.error(`[error] likedTweets`, error);
    }

    try {
      const scrap = await saveRetweets(scraper);
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

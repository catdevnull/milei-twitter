import { readFile } from "node:fs/promises";
import { Scraper, SearchMode, Tweet } from "@catdevnull/twitter-scraper";
import { Cookie, CookieJar } from "tough-cookie";
import { LikedTweet, Retweet, Scrap, zTweet } from "api/schema.ts";
import { nanoid } from "nanoid";
import { pushScrap } from "./dbs/scraps/index.ts";
import { AccountInfo, parseAccountList } from "./addAccounts.ts";
import pDebounce from "p-debounce";
import { z } from "zod";
import {
  fetch,
  Headers,
  ProxyAgent,
  Request,
  RequestInit,
  Response,
} from "undici";

async function getAccountList() {
  if (process.env.AUTH_TOKEN) {
    process.env.ACCOUNTS_FILE_FORMAT = "authToken";
    return `${process.env.AUTH_TOKEN}`;
  } else if (process.env.ACCOUNTS_LIST) {
    return process.env.ACCOUNTS_LIST;
  } else {
    const accountsFilePath = process.env.ACCOUNTS_FILE_PATH ?? "accounts.txt";
    const accountsFile = await readFile(accountsFilePath, "utf-8");
    return accountsFile;
  }
}

async function fetchWithProxy(
  input: string | URL | Request,
  init: RequestInit | undefined
) {
  const proxyUrl = process.env.PROXY_URL;
  if (!proxyUrl) {
    return fetch(input, init);
  }

  const proxyAgent = new ProxyAgent(proxyUrl);
  return fetch(input, { ...init, dispatcher: proxyAgent });
}

export async function newScraper() {
  // make sure it's readable
  await getAccountList();

  let cookieJar = new CookieJar();
  let loggedIn = false;

  let failedAccountUsernames = new Set<string>();
  const scraper = new Scraper({
    // we are using any because of undici types mismatch
    fetch: fetchWithRandomAccount as any,
  });

  const logIn = pDebounce.promise(async () => {
    await scraper.logout();
    const accountsList = await getAccountList();
    const accounts = parseAccountList(
      accountsList,
      process.env.ACCOUNTS_FILE_FORMAT
    );

    // Keep trying to log into accounts unless any don't work
    while (!loggedIn) {
      let account: AccountInfo;
      do {
        if (failedAccountUsernames.size >= accounts.length) {
          console.error("resetting failed accounts list");
          failedAccountUsernames = new Set();
        }
        account = accounts[Math.floor(Math.random() * accounts.length)];
      } while (failedAccountUsernames.has(account.username));
      try {
        const scraper = new Scraper();
        console.debug(account);
        try {
          if (!account.authToken) throw false;
          await scraper.loginWithToken(account.authToken);
          loggedIn = await scraper.isLoggedIn();
        } catch (error) {
          if (error) {
            if (account.username && account.password) {
              console.warn(
                `Couldn't log in with authToken, logging in with username/password. Error:`,
                error.toString()
              );
            } else {
              console.warn(
                `Couldn't log in with authToken, and no username/password provided. Error:`,
                error.toString()
              );
              throw error;
            }
          }

          await scraper.login(
            account.username,
            account.password,
            account.email,
            account.twoFactorSecret
          );
          loggedIn = await scraper.isLoggedIn();
        }
        if (loggedIn) {
          console.debug(`Logged into @${account.username}`);
          console.debug(
            `auth_token: ${(await scraper.getCookies()).find((c) => c.key === "auth_token")?.value}`
          );
          for (const cookie of await scraper.getCookies()) {
            await cookieJar.setCookie(cookie.toString(), "https://twitter.com");
            // await cookieJar.setCookie(cookie.toString(), "https://x.com");
          }
        }
      } catch (error) {
        console.error(
          `Couldn't login into @${account.username}:`,
          (error as any).toString()
        );
        failedAccountUsernames.add(account.username);
        if (((error as any).toString() as string).includes("ArkoseLogin")) {
          await wait(30 * 1000);
        }
      }
    }
  });

  async function fetchWithRandomAccount(
    input: string | URL | Request,
    init: RequestInit | undefined
  ): Promise<Response> {
    if (!loggedIn) {
      console.debug("Tried to req but wasn't logged in");
      await logIn();
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

    const response = await fetchWithProxy(input, { ...init, headers });
    {
      const cookie = Cookie.parse(response.headers.get("set-cookie") || "");
      if (cookie) cookieJar.setCookie(cookie, response.url);
    }

    // Rate limit, retry with another account
    if (response.status === 429) {
      cookieJar = new CookieJar();
      loggedIn = false;
      console.warn(`rate limited, retrying with another account`);
      return await fetchWithRandomAccount(input, init);
    }
    // Possibly suspended, retry with another account
    if (response.status === 403) {
      cookieJar = new CookieJar();
      loggedIn = false;
      console.warn(`403, retrying with another account`);
      return await fetchWithRandomAccount(input, init);
    }

    const json = await response.json();
    if (
      "errors" in (json as any) &&
      (json as any).errors != null &&
      (json as any).errors.length > 0
    ) {
      cookieJar = new CookieJar();
      loggedIn = false;
      console.warn(`error in response, retrying with another account`);
      return await fetchWithRandomAccount(input, init);
    }

    return new Response(JSON.stringify(json), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  return scraper;
}

export async function printLastLikes() {
  const scraper = await newScraper();
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
  const scraper = await newScraper();
  for await (const tweet of scraper.getTweets("jmilei")) {
    console.log(`@${tweet.username}: ${tweet.text}`);
  }
}

/**
 * Returns an iterator of all tweets (posts and replies, no reposts) for a username.
 * It uses the search endpoint, so it doesn't find reposts.
 * Newest to oldest.
 * @param scraper Scraper to use to get tweets
 * @param username Username of user to look tweets for
 */
export async function* getAllTweetsEver(scraper: Scraper, username: string) {
  let seenIds = new Set<string>();

  // https://socialdata.gitbook.io/docs/twitter-tweets/retrieve-search-results-by-keyword#retrieving-large-datasets
  let max_id: null | string = "";
  while (true) {
    const query = `from:${username}` + (max_id ? ` max_id:${max_id}` : "");
    const search = scraper.searchTweets(query, 999999, SearchMode.Latest);
    let lowest: null | bigint = null;
    for await (const result of search) {
      if (seenIds.has(result.id!)) {
        continue;
      }
      if (!lowest || BigInt(result.id!) < lowest) {
        lowest = BigInt(result.id!);
      }
      seenIds.add(result.id!);
      yield result;
    }
    if (!lowest) {
      break;
    } else {
      max_id = lowest.toString();
    }
  }
}

export async function printAllTweetsEver(username: string) {
  const scraper = await newScraper();

  for await (const tweet of getAllTweetsEver(scraper, username))
    console.log(JSON.stringify(tweet));

  console.debug("donezo");
}

export async function saveTweetsAndRetweets(scraper: Scraper) {
  let totalTweetsSeen = 0;
  const retweets: Array<Retweet> = [];
  // XXX: por ahora, estamos guardando los retweets tambien como tweets
  const tweets: Array<z.infer<typeof zTweet>> = [];
  for await (const tweet of scraper.getTweets("jmilei")) {
    totalTweetsSeen++;
    tweets.push({
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      id: tweet.id!,
      twitterScraperJson: JSON.stringify(tweet),
      capturedAt: new Date(),
    });
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
  }

  const scrap: Scrap = {
    finishedAt: new Date(),
    likedTweets: [],
    retweets,
    tweets,
    totalTweetsSeen,
    uid: nanoid(),
  };
  await pushScrap(scrap);
  return scrap;
}

export async function printFollowing(handle: string, jsonl: boolean) {
  const scraper = await newScraper();
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
  const scraper = await newScraper();
  while (true) {
    // try {
    //   const scrap = await saveLikes(scraper);
    //   console.log(`scrapped likes, seen ${scrap.totalTweetsSeen}`);
    // } catch (error) {
    //   console.error(`[error] likedTweets`, error);
    // }

    try {
      const scrap = await saveTweetsAndRetweets(scraper);
      console.log(
        `scrapped tweets and retweets, seen ${scrap.totalTweetsSeen}`
      );
    } catch (error) {
      console.error("[error] tweets and retweets", error);
    }

    await wait(50 * 1000 + Math.random() * 15 * 1000);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

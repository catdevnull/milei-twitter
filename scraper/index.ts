import * as schema from "./schema.ts";
import Database from "better-sqlite3";
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { z } from "zod";
import puppeteer, { Browser, Page, type CookieParam } from "puppeteer";
import { mkdir, writeFile, readFile } from "node:node:fs/promises";
import { nanoid } from "nanoid";
import { JMILEI_ID } from "api/consts.ts";

import { command, subcommands, run, option, flag, number } from "cmd-ts";
import {
  LikedTweet,
  Retweet,
  Scrap,
  zPostScrapRes,
  zScrap,
} from "api/schema.ts";
import { eq, isNull, sql } from "drizzle-orm";

const TOKEN = process.env.API_TOKEN;
if (!TOKEN) {
  console.error("Missing API_TOKEN");
  process.exit(1);
}
const API_URL = process.env.API_URL ?? "https://milei.nulo.in";
console.info(`API: ${API_URL}`);

const zTwitterLogin = z.union([
  z.object({
    username: z.string(),
    password: z.string(),
    mfaCode: z.string().optional(),
  }),
  z.object({
    auth_token: z.string(),
    ct0: z.string().optional(),
  }),
]);
type TwitterLogin = z.infer<typeof zTwitterLogin>;

{
  const scrapLikesCommand = command({
    name: "likes",
    args: {
      // dontSave: flag({ type: boolean, long: "dont-save" }),
      n: option({
        type: number,
        long: "n",
        short: "n",
        defaultValue: () => 10,
      }),
    },
    async handler({ n }) {
      const db = await connectDb();
      const scraper = new Scraper(db);
      const cuenta = await scraper.getRandomAccount();
      const scrap = await scraper.scrapAndSaveLikedTweets(n, cuenta);
      console.log(scrap);
      await scraper.browser?.close();
    },
  });
  const scrapRetweetsCommand = command({
    name: "retweets",
    args: {
      n: option({
        type: number,
        long: "n",
        short: "n",
        defaultValue: () => 10,
      }),
      saveApiResponses: flag({
        long: "save-api-responses",
        defaultValue: () => false,
      }),
      headful: flag({
        long: "headful",
        description: "run puppeteer browser as a window",
      }),
    },
    async handler({ n, saveApiResponses, headful }) {
      const db = await connectDb();
      const scraper = new Scraper(db, { headful });
      const cuenta = await scraper.getRandomAccount();
      const result = await scraper.scrapAndSaveTweets({
        n,
        saveApiResponses,
        cuenta,
      });
      console.log(result);
      await scraper.browser?.close();
    },
  });
  const scrapCommand = subcommands({
    name: "scrap",
    cmds: { likes: scrapLikesCommand, retweets: scrapRetweetsCommand },
  });
  const cronCommand = command({
    name: "cron",
    args: {},
    async handler({}) {
      const db = await connectDb();
      const scraper = new Scraper(db);
      await scraper.cron();
    },
  });
  const app = subcommands({
    name: "milei-twitter-scraper",
    cmds: { scrap: scrapCommand, cron: cronCommand },
  });
  run(app, process.argv.slice(2));
}

const dev = process.env.NODE_ENV !== "production";

const zCore = z.object({
  user_results: z.object({
    result: z.object({
      __typename: z.literal("User"),
      legacy: z.object({
        screen_name: z.string(), // handle
      }),
    }),
  }),
});

const zUserTweetsTweet = z.object({
  created_at: z.coerce.date(),
  user_id_str: z.string(),
  id_str: z.string(),
  full_text: z.string(),
});
const zUserTweetsRetweetTweet = z.object({
  created_at: z.coerce.date(),
  user_id_str: z.literal(JMILEI_ID),
  id_str: z.string(),
  retweeted_status_result: z.object({
    result: z.object({
      __typename: z.literal("Tweet"),
      rest_id: z.string(),
      core: zCore,
      legacy: zUserTweetsTweet,
    }),
  }),
});

const zUserTweetsTweetResultTweet = z.object({
  __typename: z.literal("Tweet"),
  rest_id: z.string(),
  core: zCore,
  legacy: z.union([zUserTweetsRetweetTweet, zUserTweetsTweet]),
});
const zUserTweetsTweetResult = z.discriminatedUnion("__typename", [
  zUserTweetsTweetResultTweet,
  z.object({
    __typename: z.literal("TweetWithVisibilityResults"), // una publicidad
  }),
]);

type UserTweetsRetweetTweet = z.infer<typeof zUserTweetsRetweetTweet>;
type UserTweetsTweet = z.infer<typeof zUserTweetsTweet>;

const zTimelineTimelineItem = z.object({
  entryType: z.literal("TimelineTimelineItem"),
  __typename: z.literal("TimelineTimelineItem"),
  itemContent: z.object({
    itemType: z.literal("TimelineTweet"),
    __typename: z.literal("TimelineTweet"),
    tweet_results: z.object({
      result: zUserTweetsTweetResult,
      // TODO: testear que se detectan y se descartan
      promotedMetadata: z.optional(z.object({})),
    }),
  }),
});
type TimelineTimelineItem = z.infer<typeof zTimelineTimelineItem>;
const zTimelineAddEntriesEntry = z.object({
  type: z.literal("TimelineAddEntries"),
  entries: z.array(
    z.object({
      entryId: z.string(),
      sortIndex: z.string(),
      content: z.discriminatedUnion("entryType", [
        zTimelineTimelineItem,
        z.object({
          entryType: z.literal("TimelineTimelineCursor"),
        }),
        z.object({
          entryType: z.literal("TimelineTimelineModule"),
        }),
      ]),
    })
  ),
});
const zUserTweetsRes = z.object({
  data: z.object({
    user: z.object({
      result: z.object({
        __typename: z.literal("User"),
        timeline_v2: z.object({
          timeline: z.object({
            instructions: z.array(
              z.discriminatedUnion("type", [
                z.object({ type: z.literal("TimelineClearCache") }),
                z.object({ type: z.literal("TimelineTerminateTimeline") }),
                z.object({ type: z.literal("TimelinePinEntry") }),
                zTimelineAddEntriesEntry,
              ])
            ),
          }),
        }),
      }),
    }),
  }),
});

type Db = BetterSQLite3Database<typeof schema>;
class Scraper {
  browser: Browser | null = null;
  db: Db;
  headful: boolean;
  flushUploader: () => void;
  constructor(db: Db, { headful = false }: { headful?: boolean } = {}) {
    this.db = db;
    this.headful = headful;
    this.flushUploader = this.scrapUploaderLoop();
  }

  scrapUploaderLoop() {
    let flusher: () => void;
    const flusherPromise = new Promise(
      (resolve) => (flusher = () => resolve(void 0))
    );
    (async () => {
      const scrapsToSave = await this.db.query.scraps.findMany({
        where: isNull(schema.scraps.savedWithId),
      });
      console.info(`[uploaderLoop] flushing ${scrapsToSave.length} scraps`);

      for (const entry of scrapsToSave) {
        try {
          const scrap = zScrap.parse(JSON.parse(entry.json));
          const { scrapId } = await sendScrapToApi(scrap);
          await this.db
            .update(schema.scraps)
            .set({
              savedWithId: scrapId,
            })
            .where(eq(schema.scraps.uid, entry.uid));
          console.info(`[uploaderLoop] flushed ${scrap.uid} into ${scrapId}`);
        } catch (error) {
          console.error(
            `[uploaderLoop] failed to upload scrap ${entry.uid}`,
            error
          );
        }
      }

      await Promise.race([flusherPromise, wait(30 * 1000)]);
      this.flushUploader = this.scrapUploaderLoop();
    })();
    if (!flusher!) throw new Error("no flusher defined");
    return flusher;
  }

  async scrapAndSaveLikedTweets(
    n: number | undefined = undefined,
    cuenta: TwitterLogin
  ) {
    const likedTweets = await this.scrapLikedTweets(n, cuenta);
    const scrap: Scrap = {
      finishedAt: new Date(),
      likedTweets,
      retweets: [],
      totalTweetsSeen: likedTweets.length,
      uid: nanoid(),
    };
    await this.uploadScrap(scrap);
    return scrap;
  }
  async scrapAndSaveTweets({
    n = 10,
    saveApiResponses = false,
    cuenta,
  }: {
    n?: number;
    saveApiResponses?: boolean;
    cuenta: TwitterLogin;
  }) {
    const { retweets, tweetsSeen } = await this.scrapTweets({
      n,
      cuenta,
      saveApiResponses,
    });
    const scrap: Scrap = {
      finishedAt: new Date(),
      likedTweets: [],
      retweets,
      totalTweetsSeen: tweetsSeen,
      uid: nanoid(),
    };
    await this.uploadScrap(scrap);
    return scrap;
  }

  async uploadScrap(scrap: Scrap) {
    await this.db.insert(schema.scraps).values({
      uid: scrap.uid,
      json: JSON.stringify(zScrap.parse(scrap)),
    });
    this.flushUploader();
  }

  async cron() {
    let i = 0;
    while (true) {
      const cuenta = await this.getRandomAccount();
      {
        try {
          const scrap = await this.scrapAndSaveLikedTweets(undefined, cuenta);
          console.info(`scrapped likes, seen ${scrap.totalTweetsSeen}`);
        } catch (error) {
          console.error(`likedTweets[${JSON.stringify(cuenta)}]:`, error);
        }
      }
      i--;
      if (i <= 0) {
        try {
          const scrap = await this.scrapAndSaveTweets({ cuenta });
          console.info(`scrapped retweets, seen ${scrap.totalTweetsSeen}`);
        } catch (error) {
          console.error(`tweets[${JSON.stringify(cuenta)}]:`, error);
        }
        i = 15;
      }
      this.browser?.close();
      this.browser = null;
      await wait(50 * 1000 + Math.random() * 15 * 1000);
    }
  }

  async getRandomAccount(): Promise<TwitterLogin> {
    const accounts = await this.readAccounts();
    return accounts[Math.floor(Math.random() * accounts.length)];
  }
  async setupAccountInPage(cuenta: TwitterLogin, page: Page) {
    page.deleteCookie(...(await page.cookies()));
    page.setCookie(...cookiesFromLogin(cuenta));
  }

  /**
   * va por el feed principal de /JMilei y captura los tweets
   *
   * por ahora solo guarda los retuits
   * @returns la cantidad de tweets vistos (no guardados)
   */
  async scrapTweets({
    n = 10,
    saveApiResponses = false,
    cuenta,
  }: {
    n?: number;
    saveApiResponses?: boolean;
    cuenta: TwitterLogin;
  }): Promise<{ retweets: Array<Retweet>; tweetsSeen: number }> {
    // TODO: scrapear tuits propios

    return await this.usePage(async (page) => {
      this.setupAccountInPage(cuenta, page);

      let map = new Map<string, UserTweetsTweet | UserTweetsRetweetTweet>();

      // setup API response capturing and parsing
      page.on("response", async (response) => {
        try {
          const req = response.request();
          const url = req.url();
          if (
            url.includes("/graphql/") &&
            url.includes("UserTweets?") &&
            req.method() === "GET"
          ) {
            const json = await response.json();
            if (saveApiResponses) {
              await mkdir("debug-api-responses", { recursive: true });
              await writeFile(
                `debug-api-responses/${+new Date()}-${nanoid()}.json`,
                JSON.stringify(json, undefined, 2)
              );
            }

            const parsed = zUserTweetsRes.parse(json);
            const entries =
              parsed.data.user.result.timeline_v2.timeline.instructions
                .filter(
                  (x): x is z.infer<typeof zTimelineAddEntriesEntry> =>
                    "entries" in x
                )
                .flatMap((x) =>
                  x.entries
                    .map((e) => e.content)
                    .filter(
                      (y): y is TimelineTimelineItem =>
                        y.entryType === "TimelineTimelineItem"
                    )
                )
                // filtrar publicidades
                .filter((e) => !e.itemContent.tweet_results.promotedMetadata)
                .map((e) => e.itemContent.tweet_results.result)
                // filtrar publicidades
                .filter(
                  (e): e is z.infer<typeof zUserTweetsTweetResultTweet> =>
                    e.__typename === "Tweet"
                );
            for (const entry of entries) {
              map.set(entry.legacy.id_str, entry.legacy);
            }
          }
        } catch (error) {
          console.error(`no pude capturar pedido API`, error);
        }
      });

      // go to page and scroll down to load more
      await page.goto("https://twitter.com/jmilei");
      for (let i = 0; i < n; i++) {
        const sel = `a[dir="ltr"] > time`;

        // scrollear al final para permitir que mas se cargen
        await page.waitForSelector(sel);
        const els = await page.$$(sel);
        await els[els.length - 1].scrollIntoView();

        // esperar para cargar tweets
        await wait(1000);
      }

      // filter tweets, separate into retweets and convert into our DB format
      const allTweets = Array.from(map.values()).filter((tweet) => {
        if (tweet.user_id_str !== JMILEI_ID) {
          // esto suelen ser publicidades que no me fije bien como filtrar
          console.warn(
            `tweet que no es de milei en feed https://twitter.com/${tweet.user_id_str}/status/${tweet.id_str}`
          );
          return false;
        }
        return true;
      });
      const retweets = allTweets
        .filter(
          (tweet): tweet is UserTweetsRetweetTweet =>
            "retweeted_status_result" in tweet
        )
        .map(
          (tweet): Retweet => ({
            posterId: tweet.retweeted_status_result.result.legacy.user_id_str,
            posterHandle:
              tweet.retweeted_status_result.result.core.user_results.result
                .legacy.screen_name,
            postId: tweet.retweeted_status_result.result.legacy.id_str,

            firstSeenAt: new Date(),
            postedAt: tweet.retweeted_status_result.result.legacy.created_at,
            retweetAt: tweet.created_at,
            text: tweet.retweeted_status_result.result.legacy.full_text,
          })
        );

      // XXX: ojo que puede ser que estemos contando tweets aunque no estemos logeadxs.. pero son tweets viejos populares que twitter muestra cuando no estamos logeadxs
      const totalTweetsSeen = map.size;

      return {
        tweetsSeen: totalTweetsSeen,
        retweets,
        cuenta,
      };
    });
  }

  /**
   * @param scrapId
   * @returns la cantidad de tweets vistos (no guardados)
   */
  async getAllLikedTweetsInPage(page: Page): Promise<Array<LikedTweet>> {
    const sel = `[aria-label="Timeline: Javier Milei’s liked posts"] [data-testid=tweet]`;
    await page.waitForSelector(`${sel} a[href] time`);
    await wait(500);
    const got = await page.evaluate(
      (sel: string) =>
        Array.from(document.querySelectorAll(sel))
          .filter((x) => {
            // a veces aparecen publicidades que no tienen <time> y tampoco queremos guardar
            return x.querySelector("time");
          })
          .map((x) => {
            const linkEl = x.querySelector("time")?.parentElement;
            if (!(linkEl instanceof HTMLAnchorElement))
              throw new Error("no es un link");
            const href = linkEl.href;
            const text =
              x.querySelector("[data-testid=tweetText]")?.textContent || "";

            return { href, text };
          }),
      sel
    );

    return got.map(({ href, text }) => ({
      url: href,
      text,
      firstSeenAt: new Date(),
    }));
  }

  /**
   * scrollea varias veces y guarda los tweets likeados que encuentra
   * @returns cantidad de tweets vistos
   */
  async scrapLikedTweets(
    n: number = 10,
    cuenta: TwitterLogin
  ): Promise<Array<LikedTweet>> {
    return await this.usePage(async (page) => {
      await this.setupAccountInPage(cuenta, page);
      {
        await page.goto("https://twitter.com/");
        await page.reload();
        {
          const searchBoxEl = `[data-testid="SearchBox_Search_Input"]`;
          await page.waitForSelector(searchBoxEl);
          await page.type(searchBoxEl, "javier milei");
        }
        {
          const jmileiSelector = `[data-testid="sidebarColumn"] >>> ::-p-text(@JMilei)`;
          await page.waitForSelector(jmileiSelector);
          await wait(1500);
          await page.click(jmileiSelector);
        }
        {
          const likesLinkSelector = `a[href="/JMilei/likes"]`;
          await page.waitForSelector(likesLinkSelector);
          await page.click(likesLinkSelector);
        }
      }

      let likedTweets: Array<LikedTweet> = [];
      for (let i = 0; i < n; i++) {
        const sel = `[aria-label="Timeline: Javier Milei’s liked posts"] a[dir="ltr"] > time`;

        // scrapear tweets y guardarlos
        likedTweets = likedTweets.concat(
          await this.getAllLikedTweetsInPage(page)
        );

        // scrollear al final para permitir que mas se cargenrfdo
        const els = await page.$$(sel);
        await els[els.length - 1].scrollIntoView();

        // esperar para cargar tweets
        await wait(1500);
      }
      likedTweets = likedTweets.filter(
        (val, index, array) =>
          array.findIndex((val2) => val.url === val2.url) !== index
      );
      return likedTweets;
    });
  }

  async usePage<T>(callback: (page: Page) => Promise<T>): Promise<T> {
    const newPage = async () => {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      await page.setViewport({ width: 1080, height: 1024 });
      return page;
    };

    const page = await newPage();
    try {
      return await callback(page);
    } finally {
      page.close();
    }
  }

  async getBrowser() {
    if (!this.browser) {
      if (process.env.BROWSER_WS_ENDPOINT) {
        this.browser = await puppeteer.connect({
          browserWSEndpoint: process.env.BROWSER_WS_ENDPOINT,
        });
      } else {
        this.browser = await puppeteer.launch({
          headless: !this.headful,
        });
      }
    }
    return this.browser;
  }

  async readAccounts() {
    const txt = process.env.ACCOUNTS_JSON;
    if (!txt) throw new Error("falta ACCOUNTS_JSON");
    const json = JSON.parse(txt);
    return z.array(zTwitterLogin).parse(json);
  }
}

async function sendScrapToApi(scrap: Scrap) {
  const res = await fetch(`${API_URL}/api/internal/scraper/scrap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(scrap),
  });
  if (!res.ok) {
    throw new Error(`HTTP status response: ${res.status}`);
  }
  const json = await res.json();
  return zPostScrapRes.parse(json);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectDb() {
  const sqlite = new Database(process.env.DB_PATH ?? "sqlite.db");
  sqlite.pragma("journal_mode=wal");
  const db = drizzle(sqlite, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

function cookiesFromLogin(twitterLogin: TwitterLogin): Array<CookieParam> {
  if ("username" in twitterLogin) {
    throw new Error("login not yet supported");
  }

  const cookies: Array<CookieParam> = [
    {
      name: "auth_token",
      value: twitterLogin.auth_token,
      domain: ".twitter.com",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "None",
    },
  ];
  if (twitterLogin.ct0) {
    cookies.push({
      name: "ct0",
      value: twitterLogin.ct0,
      domain: ".twitter.com",
      path: "/",
      secure: true,
      httpOnly: false,
      sameSite: "Lax",
    });
  }
  return cookies;
}

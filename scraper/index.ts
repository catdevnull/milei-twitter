import puppeteer, { Browser, Page, type CookieParam } from "puppeteer";

import {
  command,
  subcommands,
  run,
  option,
  flag,
  number,
  boolean,
} from "cmd-ts";

const scrapLikesCommand = command({
  name: "likes",
  args: {
    // dontSave: flag({ type: boolean, long: "dont-save" }),
    n: option({ type: number, long: "n", short: "n", defaultValue: () => 10 }),
  },
  async handler({ n }) {
    const db = await connectDb(process.env.DB_PATH);
    const scraper = new Scraper(db);
    const cuenta = await this.getRandomAccount();
    await scraper.scrap(cuenta, n);
    await scraper.browser?.close();
  },
});
const scrapRetweetsCommand = command({
  name: "retweets",
  args: {
    notSave: flag({
      long: "not-save",
      description: "don't save results into database",
    }),
    n: option({ type: number, long: "n", short: "n", defaultValue: () => 10 }),
    saveApiResponses: flag({
      long: "save-api-responses",
      defaultValue: () => false,
    }),
    headful: flag({
      long: "headful",
      description: "run puppeteer browser as a window",
    }),
  },
  async handler({ notSave, n, saveApiResponses, headful }) {
    const db = await connectDb(process.env.DB_PATH);
    const scraper = new Scraper(db, { headful });
    const cuenta = await scraper.getRandomAccount();
    const result = await scraper.scrapTweets({ n, saveApiResponses, cuenta });
    console.log(result);
    if (!notSave) await scraper.saveTweetsScrap(result);
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
    const db = await connectDb(process.env.DB_PATH);
    const scraper = new Scraper(db);
    await scraper.cron();
  },
});
const app = subcommands({
  name: "milei-twitter-scraper",
  cmds: { scrap: scrapCommand, cron: cronCommand },
});
run(app, process.argv.slice(2));

import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/schema.js";
import { connectDb } from "../src/lib/connectDb.js";
import { sql, eq } from "drizzle-orm";
import { z } from "zod";
import { mkdir, writeFile } from "fs/promises";
import { nanoid } from "nanoid";
import { JMILEI_ID } from "../src/lib/consts.js";
const dev = process.env.NODE_ENV !== "production";

function cookiesFromAccountData(cuenta: schema.Cuenta): Array<CookieParam> {
  if (!cuenta.accountDataJson) throw new Error("falta token");
  const tokens = schema.zTokenAccountData.parse(
    JSON.parse(cuenta.accountDataJson),
  );
  const cookies: Array<CookieParam> = [
    {
      name: "auth_token",
      value: tokens.auth_token,
      domain: ".twitter.com",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "None",
    },
    {
      name: "ct0",
      value: tokens.ct0,
      domain: ".twitter.com",
      path: "/",
      secure: true,
      httpOnly: false,
      sameSite: "Lax",
    },
  ];
  return cookies;
}

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
    }),
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
              ]),
            ),
          }),
        }),
      }),
    }),
  }),
});

type Db = BetterSQLite3Database<typeof schema>;
type TweetsScrapResult = {
  tweetsSeen: number;
  retweets: Array<schema.Retweet>;
  cuenta: schema.Cuenta;
};

class Scraper {
  browser: Browser | null = null;
  db: Db;
  headful: boolean;
  constructor(db: Db, { headful = false }: { headful?: boolean } = {}) {
    this.db = db;
    this.headful = headful;
  }

  async scrap(cuenta: schema.Cuenta, n: number | undefined = undefined) {
    try {
      const scrap = await this.db
        .insert(schema.scraps)
        .values({ at: new Date(), cuentaId: cuenta.id })
        .returning();
      const scrapId = scrap[0].id;

      const count = await this.scrapLikedTweets(n, cuenta, scrapId);
      await this.db
        .update(schema.scraps)
        .set({
          totalTweetsSeen: count,
        })
        .where(eq(schema.scraps.id, scrapId));
    } catch (error) {
      console.error(`oneoff[${cuenta?.id}]:`, error);
    } finally {
      if (!dev) {
        await this.browser?.close();
        this.browser = null;
      }
    }
  }

  async cron() {
    let i = 0;
    while (true) {
      const cuenta = await this.getRandomAccount();
      await this.scrap(cuenta);
      i--;
      if (i <= 0) {
        try {
          const result = await this.scrapTweets({ cuenta });
          await this.saveTweetsScrap(result);
        } catch (error) {
          console.error(`tweets[${cuenta.id}]:`, error);
        }
        i = 15;
      }
      await wait(50 * 1000 + Math.random() * 15 * 1000);
    }
  }

  async getRandomAccount(): Promise<schema.Cuenta> {
    const cuenta = await this.db.query.cuentas.findFirst({
      orderBy: sql`random()`,
    });
    if (!cuenta) throw new Error("no tengo cuentas para scrapear");
    return cuenta;
  }
  async setupAccountInPage(cuenta: schema.Cuenta, page: Page) {
    page.deleteCookie(...(await page.cookies()));
    page.setCookie(...cookiesFromAccountData(cuenta));
  }

  /**
   * @returns la cantidad de tweets vistos (no guardados)
   */
  async scrapTweets({
    n = 5,
    saveApiResponses = false,
    cuenta,
  }: {
    n?: number;
    saveApiResponses?: boolean;
    cuenta: schema.Cuenta;
  }): Promise<TweetsScrapResult> {
    // TODO: scrapear tuits propios

    return await this.usePage(async (page) => {
      this.setupAccountInPage(cuenta, page);

      let map = new Map<string, UserTweetsTweet | UserTweetsRetweetTweet>();

      // setup API response capturing and parsing
      page.on("response", async (response) => {
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
              JSON.stringify(json, undefined, 2),
            );
          }

          const parsed = zUserTweetsRes.parse(json);
          const entries =
            parsed.data.user.result.timeline_v2.timeline.instructions
              .filter(
                (x): x is z.infer<typeof zTimelineAddEntriesEntry> =>
                  "entries" in x,
              )
              .flatMap((x) =>
                x.entries
                  .map((e) => e.content)
                  .filter(
                    (y): y is TimelineTimelineItem =>
                      y.entryType === "TimelineTimelineItem",
                  ),
              )
              // filtrar publicidades
              .filter((e) => !e.itemContent.tweet_results.promotedMetadata)
              .map((e) => e.itemContent.tweet_results.result)
              // filtrar publicidades
              .filter(
                (e): e is z.infer<typeof zUserTweetsTweetResultTweet> =>
                  e.__typename === "Tweet",
              );
          for (const entry of entries) {
            map.set(entry.legacy.id_str, entry.legacy);
          }
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
            `tweet que no es de milei en feed https://twitter.com/${tweet.user_id_str}/status/${tweet.id_str}`,
          );
          return false;
        }
        return true;
      });
      const retweets = allTweets
        .filter(
          (tweet): tweet is UserTweetsRetweetTweet =>
            "retweeted_status_result" in tweet,
        )
        .map(
          (tweet): schema.Retweet => ({
            posterId: tweet.retweeted_status_result.result.legacy.user_id_str,
            posterHandle:
              tweet.retweeted_status_result.result.core.user_results.result
                .legacy.screen_name,
            postId: tweet.retweeted_status_result.result.legacy.id_str,

            firstSeenAt: new Date(),
            postedAt: tweet.retweeted_status_result.result.legacy.created_at,
            retweetAt: tweet.created_at,
            text: tweet.retweeted_status_result.result.legacy.full_text,
          }),
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

  async saveTweetsScrap({ retweets, tweetsSeen, cuenta }: TweetsScrapResult) {
    const scrap = await this.db
      .insert(schema.scraps)
      .values({
        at: new Date(),
        cuentaId: cuenta.id,
        totalTweetsSeen: tweetsSeen,
      })
      .returning();
    const scrapId = scrap[0].id;
    // TODO: guardar tweets propios
    for (const retweet of retweets.map((r) => ({ ...r, scrapId }))) {
      await this.db
        .insert(schema.retweets)
        .values(retweet)
        .onConflictDoNothing();
    }
  }

  /**
   * @param scrapId
   * @returns la cantidad de tweets vistos (no guardados)
   */
  async saveLikedTweets(page: Page, scrapId: number): Promise<number> {
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
            const href = linkEl?.href;
            const text = x.querySelector(
              "[data-testid=tweetText]",
            )?.textContent;

            return { href, text };
          }),
      sel,
    );

    for (const { href, text } of got) {
      let q = this.db
        .insert(schema.likedTweets)
        .values({ url: href, text, firstSeenAt: new Date(), scrapId });
      if (text)
        q = q.onConflictDoUpdate({
          target: schema.likedTweets.url,
          set: { text },
        });
      else q = q.onConflictDoNothing();
      await q;
    }

    return got.length;
  }

  /**
   * scrollea varias veces y guarda los tweets likeados que encuentra
   * @returns cantidad de tweets vistos
   */
  async scrapLikedTweets(
    n: number = 10,
    cuenta: schema.Cuenta,
    scrapId: number,
  ): Promise<number> {
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

      let count = 0;

      for (let i = 0; i < n; i++) {
        const sel = `[aria-label="Timeline: Javier Milei’s liked posts"] a[dir="ltr"] > time`;

        // scrapear tweets y guardarlos
        count += await this.saveLikedTweets(page, scrapId);

        // scrollear al final para permitir que mas se cargenrfdo
        const els = await page.$$(sel);
        await els[els.length - 1].scrollIntoView();

        // esperar para cargar tweets
        await wait(1500);
      }

      return count;
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
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import puppeteer, { Browser, Page } from "puppeteer";
import cookies from "./cookie.js";

import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { db } from "$lib/db.js";
import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";

type Db = BetterSQLite3Database<typeof schema>;
class Scraper {
  puppeteer: { browser: Browser; page: Page } | null = null;
  db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  async oneoff(n: number | undefined = undefined) {
    try {
      await this.goToLikes();
      await this.scrapLikedTweets(n);
    } catch (error) {
      console.error("oneoff:", error);
    } finally {
      await this.puppeteer?.browser.close();
      this.puppeteer = null;
    }
  }

  async cron() {
    await this.oneoff(50);
    while (true) {
      await this.oneoff(10);
      await wait(50 * 1000 + Math.random() * 15 * 1000);
    }
  }

  async saveLikedTweets() {
    const { page } =
      this.puppeteer || (this.puppeteer = await this.buildBrowser());

    const sel = `[aria-label="Timeline: Javier Milei’s liked posts"] [data-testid=tweet]`;
    await page.waitForSelector(sel);
    const got = await page.evaluate(
      (sel: string) =>
        Array.from(document.querySelectorAll(sel), (x) => {
          const href = (
            x.querySelector("time")?.parentElement as HTMLAnchorElement
          ).href;
          const text = x.querySelector("[data-testid=tweetText]")?.textContent;

          return { href, text };
        }),
      sel,
    );

    console.debug(got);

    for (const { href, text } of got) {
      let q = this.db
        .insert(schema.likedTweets)
        .values({ url: href, text, firstSeenAt: new Date() });
      if (text)
        q = q.onConflictDoUpdate({
          target: schema.likedTweets.url,
          set: { text },
        });
      else q = q.onConflictDoNothing();
      await q;
    }
  }

  /**
   * scrollea varias veces y guarda los tweets likeados que encuentra
   */
  async scrapLikedTweets(n: number = 10) {
    const { page } =
      this.puppeteer || (this.puppeteer = await this.buildBrowser());

    for (let i = 0; i < n; i++) {
      const sel = `[aria-label="Timeline: Javier Milei’s liked posts"] a[dir="ltr"] > time`;

      // scrapear tweets y guardarlos
      await this.saveLikedTweets();

      // scrollear al final para permitir que mas se cargenrfdo
      const els = await page.$$(sel);
      await els[els.length - 1].scrollIntoView();

      // esperar para cargar tweets
      await wait(1500);
    }
  }

  async goToLikes() {
    const { page } =
      this.puppeteer || (this.puppeteer = await this.buildBrowser());

    await page.goto("https://twitter.com");
    {
      const searchBoxEl = `[data-testid="SearchBox_Search_Input"]`;
      await page.waitForSelector(searchBoxEl);
      await page.type(searchBoxEl, "javier milei");
    }
    {
      const jmileiSelector = `[data-testid="sidebarColumn"] >>> ::-p-text(@JMilei)`;
      await page.waitForSelector(jmileiSelector);
      await wait(500);
      await page.click(jmileiSelector);
    }
    {
      const likesLinkSelector = `a[href="/JMilei/likes"]`;
      await page.waitForSelector(likesLinkSelector);
      await page.click(likesLinkSelector);
    }
  }

  async buildBrowser() {
    let browser;
    if (env.BROWSER_WS_ENDPOINT) {
      browser = await puppeteer.connect({
        browserWSEndpoint: env.BROWSER_WS_ENDPOINT,
      });
    } else {
      browser = await puppeteer.launch({
        // headless: false,
      });
    }
    const page = await browser.newPage();

    await page.setCookie(...cookies);
    await page.setViewport({ width: 1080, height: 1024 });

    return { browser, page };
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (!dev) new Scraper(db).cron();
else new Scraper(db).oneoff(50);

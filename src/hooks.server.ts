import puppeteer, { Browser, Page } from "puppeteer";
import cookies from "./cookie.js";

import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { db } from "$lib/db.js";

type Db = BetterSQLite3Database<typeof schema>;
class Scraper {
  puppeteer: { browser: Browser; page: Page } | null = null;
  db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  async cron() {
    while (true) {
      await this.scrap();
      await wait(30 * 60 * 1000 + Math.random() * 15 * 60 * 1000);
    }
  }

  // TODO: simplemente dejar una página abierta y escuchar por tweets nuevos cuando twitter los strimee
  async scrap() {
    const { browser, page } =
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

    let links = new Set<string>();

    async function getLinksAndScroll() {
      const sel = `[aria-label="Timeline: Javier Milei’s liked posts"] a[dir="ltr"] > time`;
      await page.waitForSelector(sel);
      const got = await page.evaluate(
        (sel: string) =>
          Array.from(
            document.querySelectorAll(sel),
            (x) => (x.parentElement as HTMLAnchorElement).href,
          ),
        sel,
      );

      for (const link of got) links.add(link);
      console.debug(links);

      const els = await page.$$(sel);
      await els[els.length - 1].scrollIntoView();
    }

    for (let i = 0; i < 10; i++) {
      await getLinksAndScroll();
      await wait(1500);
    }

    for (const link of links) {
      await this.db
        .insert(schema.likedTweets)
        .values({ url: link, firstSeenAt: new Date() })
        .onConflictDoNothing();
    }
  }

  async buildBrowser() {
    const browser = await puppeteer.launch({
      headless: false,
    });
    const page = await browser.newPage();

    await page.setCookie(...cookies);
    await page.setViewport({ width: 1080, height: 1024 });

    return { browser, page };
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

new Scraper(db).cron();

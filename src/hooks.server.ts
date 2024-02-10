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

  async cron() {
    await this.goToLikes();
    while (true) {
      await this.scrapLikedTweets();
      await wait(50 * 1000 + Math.random() * 15 * 1000);
      const { page } =
        this.puppeteer || (this.puppeteer = await this.buildBrowser());

      // guardar tweets otra vez por si cargaron unos nuevos
      await this.saveLikedTweets();

      // recargar tweets para asegurarse de tener tweets nuevos
      await page.reload();
    }
  }

  async saveLikedTweets() {
    const { page } =
      this.puppeteer || (this.puppeteer = await this.buildBrowser());

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

    console.debug(got);

    for (const link of got) {
      await this.db
        .insert(schema.likedTweets)
        .values({ url: link, firstSeenAt: new Date() })
        .onConflictDoNothing();
    }
  }

  /**
   * scrollea varias veces y guarda los tweets likeados que encuentra
   */
  async scrapLikedTweets() {
    const { page } =
      this.puppeteer || (this.puppeteer = await this.buildBrowser());

    for (let i = 0; i < 10; i++) {
      const sel = `[aria-label="Timeline: Javier Milei’s liked posts"] a[dir="ltr"] > time`;

      // scrapear tweets y guardarlos
      await this.saveLikedTweets();

      // scrollear al final para permitir que mas se cargen
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

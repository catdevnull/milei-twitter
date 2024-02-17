import puppeteer, { Browser, Page, type CookieParam } from "puppeteer";

import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { db } from "$lib/db.js";
import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { sql, eq } from "drizzle-orm";

type Db = BetterSQLite3Database<typeof schema>;
class Scraper {
  puppeteer: { browser: Browser; page: Page } | null = null;
  db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  async scrap(n: number | undefined = undefined) {
    const cuenta = await this.db.query.cuentas.findFirst({
      orderBy: sql`random()`,
    });
    try {
      if (!cuenta) throw new Error("no tengo cuentas para scrapear");
      if (!cuenta.accountDataJson) throw new Error("falta token");
      const scrap = await this.db
        .insert(schema.scraps)
        .values({ at: new Date(), cuentaId: cuenta.id })
        .returning();
      const scrapId = scrap[0].id;

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

      const { page } =
        this.puppeteer || (this.puppeteer = await this.buildBrowser());
      await page.setCookie(...cookies);

      await this.goToLikes();
      const count = await this.scrapLikedTweets(n, scrapId);
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
        await this.puppeteer?.browser.close();
        this.puppeteer = null;
      }
    }
  }

  async cron() {
    while (true) {
      await this.scrap();
      await wait(50 * 1000 + Math.random() * 15 * 1000);
    }
  }

  /**
   * @param scrapId
   * @returns la cantidad de tweets vistos (no guardados)
   */
  async saveLikedTweets(scrapId: number): Promise<number> {
    const { page } =
      this.puppeteer || (this.puppeteer = await this.buildBrowser());

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

    console.debug(got);

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
  async scrapLikedTweets(n: number = 10, scrapId: number): Promise<number> {
    const { page } =
      this.puppeteer || (this.puppeteer = await this.buildBrowser());

    let count = 0;

    for (let i = 0; i < n; i++) {
      const sel = `[aria-label="Timeline: Javier Milei’s liked posts"] a[dir="ltr"] > time`;

      // scrapear tweets y guardarlos
      count += await this.saveLikedTweets(scrapId);

      // scrollear al final para permitir que mas se cargenrfdo
      const els = await page.$$(sel);
      await els[els.length - 1].scrollIntoView();

      // esperar para cargar tweets
      await wait(1500);
    }

    return count;
  }

  async goToLikes() {
    const { page } =
      this.puppeteer || (this.puppeteer = await this.buildBrowser());

    // empezar en cuenta random así no consume de la cuota de tuits leyendo de la home
    await page.goto("https://twitter.com/profile");
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

    await page.setViewport({ width: 1080, height: 1024 });

    return { browser, page };
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (!dev) new Scraper(db).cron();
else new Scraper(db).scrap(50);

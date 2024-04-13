import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { openScrapsDb } from "../index.ts";
import * as schema from "./schema.ts";
import { Scrap, zPostScrapRes, zScrap } from "api/schema.ts";
import { eq, isNull } from "drizzle-orm";

const API_URL = process.env.API_URL ?? "https://milei.nulo.in";
console.info(`API_URL=${API_URL}`);
if (!process.env.API_TOKEN) console.error("Missing API_TOKEN");

class ScrapsDb {
  db: Promise<BetterSQLite3Database<typeof schema>>;
  constructor() {
    this.db = openScrapsDb();
  }

  get API_TOKEN() {
    const TOKEN = process.env.API_TOKEN;
    if (!TOKEN) {
      console.error("Missing API_TOKEN");
      process.exit(1);
    }
    return TOKEN;
  }

  async pushScrap(scrap: Scrap) {
    await (await this.db).insert(schema.scraps).values({
      uid: scrap.uid,
      json: JSON.stringify(zScrap.parse(scrap)),
    });
    this.flushScraps();
  }

  async flushScraps() {
    const scrapsToSave = await (
      await this.db
    ).query.scraps.findMany({
      where: isNull(schema.scraps.savedWithId),
    });
    console.info(`[scraps] flushing ${scrapsToSave.length} scraps`);
    await Promise.all(
      scrapsToSave.map(async (entry) => {
        try {
          const { scrapId } = await sendScrapToApi(entry.json, this.API_TOKEN);
          await (
            await this.db
          )
            .update(schema.scraps)
            .set({
              savedWithId: scrapId,
            })
            .where(eq(schema.scraps.uid, entry.uid));
          console.info(`[scraps] flushed ${entry.uid} into ${scrapId}`);
        } catch (error) {
          console.error(`[scraps] failed to upload scrap ${entry.uid}`, error);
        }
      })
    );
  }
}

const db = new ScrapsDb();

export const pushScrap = db.pushScrap.bind(db);

async function sendScrapToApi(scrapJson: string, token: string) {
  const res = await fetch(`${API_URL}/api/internal/scraper/scrap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: scrapJson,
  });
  if (!res.ok) {
    throw new Error(`HTTP status response: ${res.status}`);
  }
  const json = await res.json();
  return zPostScrapRes.parse(json);
}

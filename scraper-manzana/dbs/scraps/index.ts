import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { scrapsDb } from "../index.ts";
import * as schema from "./schema.ts";
import { Scrap, zPostScrapRes, zScrap } from "api/schema.ts";
import { eq, isNull } from "drizzle-orm";

const TOKEN = process.env.API_TOKEN;
if (!TOKEN) {
  console.error("Missing API_TOKEN");
  process.exit(1);
}
const API_URL = process.env.API_URL ?? "https://milei.nulo.in";
console.info(`API_URL=${API_URL}`);

class ScrapsDb {
  db: BunSQLiteDatabase<typeof schema>;
  constructor(db: BunSQLiteDatabase<typeof schema>) {
    this.db = db;
  }

  async pushScrap(scrap: Scrap) {
    await this.db.insert(schema.scraps).values({
      uid: scrap.uid,
      json: JSON.stringify(zScrap.parse(scrap)),
    });
    this.flushScraps();
  }

  async flushScraps() {
    const scrapsToSave = await this.db.query.scraps.findMany({
      where: isNull(schema.scraps.savedWithId),
    });
    console.info(`[scraps] flushing ${scrapsToSave.length} scraps`);

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
        console.info(`[scraps] flushed ${scrap.uid} into ${scrapId}`);
      } catch (error) {
        console.error(`[scraps] failed to upload scrap ${entry.uid}`, error);
      }
    }
  }
}

const db = new ScrapsDb(scrapsDb);

export const pushScrap = db.pushScrap.bind(db);

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

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { openScrapsDb } from "../index.ts";
import * as schema from "./schema.ts";
import { type Scrap, zPostScrapRes } from "api/schema.ts";
import { and, desc, eq, inArray, isNotNull, isNull, not } from "drizzle-orm";
import "dotenv/config";

const API_URL = process.env.API_URL ?? "https://milei.nulo.lol";
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
      json: JSON.stringify(scrap),
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
    const allSaved = (
      await Promise.all(
        scrapsToSave.map(async (entry) => {
          try {
            const { scrapId } = await sendScrapToApi(
              entry.json,
              this.API_TOKEN
            );
            await (
              await this.db
            )
              .update(schema.scraps)
              .set({
                savedWithId: scrapId,
              })
              .where(eq(schema.scraps.uid, entry.uid));
            console.info(`[scraps] flushed ${entry.uid} into ${scrapId}`);
            return true;
          } catch (error) {
            console.error(
              `[scraps] failed to upload scrap ${entry.uid}`,
              error
            );
            return false;
          }
        })
      )
    ).every(Boolean);
    if (allSaved) {
      console.info(
        "[scraps] deleting already pushed scraps except latest three"
      );
      const latestThree = await (await this.db)
        .select({ uid: schema.scraps.uid })
        .from(schema.scraps)
        .where(isNotNull(schema.scraps.savedWithId))
        .orderBy(desc(schema.scraps.savedWithId))
        .limit(3);

      await (await this.db).delete(schema.scraps).where(
        and(
          isNotNull(schema.scraps.savedWithId),
          not(
            inArray(
              schema.scraps.uid,
              latestThree.map((s) => s.uid)
            )
          )
        )
      );
    }
  }

  async getLastScrap(): Promise<Scrap | null> {
    const scrap = await (await this.db)
      .select({ json: schema.scraps.json })
      .from(schema.scraps)
      .where(isNotNull(schema.scraps.savedWithId))
      .orderBy(desc(schema.scraps.savedWithId))
      .limit(1);
    if (!scrap[0]) return null;
    return JSON.parse(scrap[0]?.json);
  }
}

export const db = new ScrapsDb();

export const pushScrap = db.pushScrap.bind(db);

export async function sendScrapToApi(scrapJson: string, token: string) {
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

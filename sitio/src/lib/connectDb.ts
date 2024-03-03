import * as schema from "../schema.ts";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { drizzle as bunDrizzle } from "drizzle-orm/bun-sqlite";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { migrate as bunMigrate } from "drizzle-orm/bun-sqlite/migrator";

export async function connectDb({ path }: { path: string }) {
  if ("Bun" in globalThis) {
    const { Database } = await import("bun:sqlite");
    const sqlite = new Database(path);
    // sqlite.pragma("journal_mode=wal");
    const db = bunDrizzle(sqlite, { schema, logger: true });
    await bunMigrate(db, { migrationsFolder: "drizzle" });
    return db;
  }
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode=wal");
  const db = drizzle(sqlite, { schema, logger: true });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

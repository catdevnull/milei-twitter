import * as schema from "../schema.ts";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

export async function connectDb({ path }: { path: string }) {
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode=wal");
  const db = drizzle(sqlite, { schema, logger: true });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

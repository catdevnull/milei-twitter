import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "../schema";

export async function connectDb(DB_PATH?: string) {
  const sqlite = new Database(DB_PATH ?? "sqlite.db");
  await sqlite.exec("PRAGMA journal_mode=WAL;");
  const db = drizzle(sqlite, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

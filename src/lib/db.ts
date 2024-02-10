import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "../schema.js";

async function connectDb() {
  const sqlite = new Database("sqlite.db");
  await sqlite.exec("PRAGMA journal_mode=WAL;");
  const db = drizzle(sqlite, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

export const db = await connectDb();

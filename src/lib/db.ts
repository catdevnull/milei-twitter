import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "../schema.js";

async function connectDb() {
  const sqlite = new Database("sqlite.db");
  const db = drizzle(sqlite, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

export const db = await connectDb();

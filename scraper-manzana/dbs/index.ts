import Database from "better-sqlite3";
import { join } from "node:path";
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as accountsSchema from "./accounts/schema.js";
import * as scrapsSchema from "./scraps/schema.js";

const DBS_PATH = process.env.DBS_PATH ?? ".";

type DbType = "accounts" | "scraps";

async function migrateDb(
  db: BetterSQLite3Database<any>,
  name: DbType
): Promise<void> {
  await migrate(db, {
    migrationsFolder: join(import.meta.dirname, name, "drizzle"),
  });
}

async function openSqliteDb(name: DbType) {
  const dbPath = join(DBS_PATH, `${name}.db`);
  const sqlite = new Database(dbPath);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA busy_timeout = 5000;");
  const tempDrizzle = drizzle(sqlite);
  await migrateDb(tempDrizzle, name);
  return sqlite;
}

export async function openAccountsDb() {
  return drizzle(await openSqliteDb("accounts"), {
    schema: accountsSchema,
  });
}
export async function openScrapsDb() {
  return drizzle(await openSqliteDb("scraps"), {
    schema: scrapsSchema,
  });
}

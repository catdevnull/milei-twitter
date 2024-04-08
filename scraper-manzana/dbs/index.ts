import { Database } from "bun:sqlite";
import { join } from "node:path";
import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as accountsSchema from "./accounts/schema.js";
import * as scrapsSchema from "./scraps/schema.js";

const DBS_PATH = process.env.DBS_PATH ?? ".";

type DbType = "accounts" | "scraps";

async function migrateDb(
  db: BunSQLiteDatabase<any>,
  name: DbType
): Promise<void> {
  await migrate(db, {
    migrationsFolder: join(import.meta.dir, name, "drizzle"),
  });
}

async function openSqliteDb(name: DbType): Promise<Database> {
  const dbPath = join(DBS_PATH, `${name}.db`);
  const sqlite = new Database(dbPath);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA busy_timeout = 5000;");
  const tempDrizzle = drizzle(sqlite);
  await migrateDb(tempDrizzle, name);
  return sqlite;
}

export const accountsDb = drizzle(await openSqliteDb("accounts"), {
  schema: accountsSchema,
});
export const scrapsDb = drizzle(await openSqliteDb("scraps"), {
  schema: scrapsSchema,
});

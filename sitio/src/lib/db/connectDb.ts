import * as schema from "../../schema";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
export async function connectDb({
  url,
  authToken,
}: {
  url: string;
  authToken?: string;
}) {
  const client = createClient({ url, authToken });
  // await client.execute(`PRAGMA journal_mode = WAL;`);
  // await client.execute(`PRAGMA busy_timeout = 5000;`);
  // await client.execute(`PRAGMA synchronous = NORMAL;`);
  // await client.execute(`PRAGMA cache_size = 1000000000;`);
  // await client.execute(`PRAGMA foreign_keys = true;`);
  // await client.execute(`PRAGMA temp_store = memory;`);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

import * as schema from "../schema";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { env } from "$env/dynamic/private";

export async function connectDb(DB_PATH?: string) {
  const client = createClient({
    url: env.TURSO_CONNECTION_URL!,
    authToken: env.TURSO_AUTH_TOKEN!,
  });
  const db = drizzle(client, { schema });
  // await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

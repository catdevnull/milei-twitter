import * as schema from "../schema";
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
  const db = drizzle(client, { schema, logger: true });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

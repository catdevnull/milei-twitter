import * as schema from "../../schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export async function connectDb({
  url,
  authToken,
}: {
  url: string;
  authToken?: string;
}) {
  const client = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

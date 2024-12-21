import * as schema from "../../schema";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import { libsqlIntegration } from "sentry-integration-libsql-client";
import * as Sentry from "@sentry/sveltekit";

export async function connectDb({
  url,
  authToken,
}: {
  url: string;
  authToken?: string;
}) {
  const client = createClient({ url, authToken });

  Sentry.init({
    dsn: "https://79b56150c5092cdad5c56c62223a1a5d@o4507188153548800.ingest.de.sentry.io/4507188155646032",
    tracesSampleRate: 1,
    profilesSampleRate: 0.1,
    enabled: import.meta.env.PROD,
    integrations: [libsqlIntegration(client, Sentry)],
  });

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

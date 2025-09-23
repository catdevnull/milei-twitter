import * as schema from "../../schema";
import { env } from "$env/dynamic/private";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const path = env.DATABASE_URL ?? "postgresql://localhost:5432/milei";

const client = postgres(path, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema: schema });

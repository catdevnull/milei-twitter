import * as schema from "../schema";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

export async function connectDb({
  url,
  authToken,
}: {
  url: string;
  authToken?: string;
}) {
  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema });
  return db;
}

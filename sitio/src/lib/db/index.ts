import { env } from "$env/dynamic/private";
import { connectDb } from "./connectDb.js";

const url = env.TURSO_CONNECTION_URL ?? "file:sqlite.db";
console.info(`Using db at ${url}`);
export const db = await connectDb({
  url,
  authToken: env.TURSO_AUTH_TOKEN,
});

import { env } from "$env/dynamic/private";
import { connectDb } from "./connectDb.js";

const path = env.TURSO_CONNECTION_URL ?? "file:sqlite.db";
console.info(`Using db at ${path}`);
export const db = await connectDb({
  url: path,
});

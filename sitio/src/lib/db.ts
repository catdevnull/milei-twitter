import { env } from "$env/dynamic/private";
import { connectDb } from "./connectDb.js";

const url = env.DB_PATH ? `file:${env.DB_PATH}` : "file:sqlite.db";
console.info(`Using db at ${url}`);
export const db = await connectDb({
  url,
});

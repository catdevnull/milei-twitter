import { env } from "$env/dynamic/private";
import { connectDb } from "./connectDb.js";

const path = env.DB_PATH ?? "sqlite.db";
console.info(`Using db at ${path}`);
export const db = await connectDb({
  path,
});

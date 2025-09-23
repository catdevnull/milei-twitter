import { env } from "$env/dynamic/private";
import { connectDb } from "./connectDb.js";

const path = env.DATABASE_URL ?? "postgresql://localhost:5432/milei";
export const db = connectDb({
  url: path,
});

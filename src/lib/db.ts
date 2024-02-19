import { env } from "$env/dynamic/private";
import { connectDb } from "./connectDb.js";

export const db = await connectDb(env.DB_PATH);

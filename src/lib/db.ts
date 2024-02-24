import { env } from "$env/dynamic/private";
import { connectDb } from "./connectDb.js";

export const db = await connectDb({
  url: env.TURSO_CONNECTION_URL!,
  authToken: env.TURSO_AUTH_TOKEN!,
});

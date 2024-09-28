import { db } from "$lib/db/index.js";
import { json } from "@sveltejs/kit";
import { desc } from "drizzle-orm";
import { tweets } from "../../../../../schema";

export async function GET() {
  const lastIds = await db.query.tweets.findMany({
    columns: {
      id: true,
    },
    orderBy: desc(tweets.id),
    limit: 200,
  });
  return json(lastIds.map((t) => t.id));
}

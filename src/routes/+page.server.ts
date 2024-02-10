import { db } from "$lib/db";
import { desc } from "drizzle-orm";
import { likedTweets } from "../schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const tweets = await db.query.likedTweets.findMany({
    orderBy: desc(likedTweets.firstSeenAt),
  });
  return { tweets };
};

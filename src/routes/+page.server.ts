import { db } from "$lib/db";
import { desc } from "drizzle-orm";
import { likedTweets, scraps } from "../schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const tweets = await db.query.likedTweets.findMany({
    orderBy: desc(likedTweets.firstSeenAt),
  });
  const lastUpdated = await db.query.likedTweets.findFirst({
    orderBy: desc(likedTweets.firstSeenAt),
  });
  return { tweets, lastUpdated };
};

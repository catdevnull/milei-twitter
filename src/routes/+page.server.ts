import { db } from "$lib/db";
import { desc } from "drizzle-orm";
import { likedTweets, scraps } from "../schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const tweets = await db.query.likedTweets.findMany({
    orderBy: desc(likedTweets.firstSeenAt),
  });
  const lastUpdated = await db.query.scraps.findFirst({
    orderBy: desc(scraps.at),
  });
  return { tweets, lastUpdated };
};

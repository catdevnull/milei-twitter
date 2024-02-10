import { db } from "$lib/db";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const tweets = await db.query.likedTweets.findMany();
  return { tweets };
};

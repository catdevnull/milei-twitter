import { db } from "$lib/db";
import { eq } from "drizzle-orm";
import { likedTweets } from "../../schema";
import type { PageServerLoad } from "../$types";

const simpleTwitterRegexp = /https:\/\/twitter.com\/[^/]+\/status\/[^/]+/;

export const load: PageServerLoad = async ({ url }) => {
  const test = url.searchParams.get("test");
  let search: any[] | null = null;
  let error: null | string = null
  if (test) {
    if (!test.match(simpleTwitterRegexp)) {
      error = "La URL del twit esta mal construida"
    } else {
      search = await db.query.likedTweets.findMany({
        columns: {
          firstSeenAt: true,
          url: true,
        },
        where: eq(likedTweets.url, test),
      });
    }
  }
  return {
    found: search,
    error
  }
}

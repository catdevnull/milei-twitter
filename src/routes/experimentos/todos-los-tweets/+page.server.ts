import { db } from "$lib/db";
import { desc, isNotNull } from "drizzle-orm";
import { likedTweets, retweets, scraps } from "../../../schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ setHeaders }) => {
  const tweets = await db.query.likedTweets.findMany({
    columns: {
      firstSeenAt: true,
      url: true,
      text: true,
    },
    orderBy: desc(likedTweets.firstSeenAt),
    limit: 200,
  });
  // const retweetss = await db.query.retweets.findMany({
  //   columns: {
  //     retweetAt: true,
  //     posterId: true,
  //     postId: true,
  //     posterHandle: true,
  //   },
  //   orderBy: desc(retweets.retweetAt),
  //   limit: 200,
  // });
  //   const lastUpdated = await db.query.scraps.findFirst({
  //     orderBy: desc(scraps.at),
  //     where: isNotNull(scraps.totalTweetsSeen),
  //   });

  setHeaders({
    "cache-control": "public, max-age=60",
  });

  return {
    tweets,
    // retweets: retweetss,
    //lastUpdated
  };
};

import { db } from "$lib/db";
import { desc } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import * as schema from "../../../schema";

export const load: PageServerLoad = async ({ setHeaders }) => {
  const retweets = await db.query.retweets.findMany({
    columns: {
      retweetAt: true,
      posterId: true,
      posterHandle: true,
      postId: true,
      text: true,
    },
    orderBy: desc(schema.retweets.retweetAt),
    limit: 1000,
  });

  setHeaders({
    "cache-control": "public, max-age=60",
  });

  return {
    retweets,
  };
};

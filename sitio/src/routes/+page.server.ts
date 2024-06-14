import { db } from "$lib/db";
import { and, asc, desc, gte, isNotNull, lt, lte } from "drizzle-orm";
import { likedTweets, retweets, scraps } from "../schema";
import type { PageServerLoad } from "./$types";
import { dayjs, likesCutoffSql } from "$lib/consts";
import { error } from "@sveltejs/kit";
import { queryLastWeek } from "$lib/data-processing/queryWeekly";

const tz = "America/Argentina/Buenos_Aires";

function getStartingFrom(query: string) {
  switch (query) {
    case "last-24h":
      return dayjs().subtract(23, "hour");
    default:
      if (!query.startsWith("date:")) error(400, "Query imposible");
      try {
        const dateStr = query.slice(5);
        const date = dayjs(dateStr, "YYYY-MM-DD").tz(tz, true);
        return date;
      } catch {
        error(400, "Query imposible");
      }
  }
}

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  const query =
    url.searchParams.get("q") ?? "date:" + dayjs().tz(tz).format("YYYY-MM-DD");
  const startingFrom = getStartingFrom(query);
  const endsAt = startingFrom.add(24, "hour");

  const t0 = performance.now();
  const [tweets, retweetss, lastUpdated, ultimaSemana, firstLikedTweet] =
    await Promise.all([
      db.query.likedTweets.findMany({
        columns: {
          firstSeenAt: true,
          url: true,
        },
        where: and(
          gte(likedTweets.firstSeenAt, startingFrom.toDate()),
          lt(likedTweets.firstSeenAt, endsAt.toDate()),
          likesCutoffSql,
        ),
        orderBy: desc(likedTweets.firstSeenAt),
      }),
      db.query.retweets.findMany({
        columns: {
          retweetAt: true,
          posterId: true,
          postId: true,
          posterHandle: true,
        },
        where: and(
          gte(retweets.retweetAt, startingFrom.toDate()),
          lt(retweets.retweetAt, endsAt.toDate()),
        ),
        orderBy: desc(retweets.retweetAt),
      }),
      db.query.scraps.findFirst({
        orderBy: desc(scraps.finishedAt),
        where: isNotNull(scraps.totalTweetsSeen),
      }),

      queryLastWeek(),

      db.query.likedTweets.findFirst({
        orderBy: asc(likedTweets.firstSeenAt),
        where: likesCutoffSql,
      }),
    ]);
  const t1 = performance.now();
  console.log("queries", t1 - t0);

  setHeaders({
    "cache-control": "public, max-age=60",
  });

  return {
    tweets,
    retweets: retweetss,
    lastUpdated,
    start: startingFrom.toDate(),
    ultimaSemana,
    firstLikedTweet,
    query,
  };
};

import { likedTweets, retweets } from "../../schema";
import { db } from "$lib/db";
import { and, desc, gte } from "drizzle-orm";
import { getMinDate, lastWeek } from "./weekly";

export async function queryLastWeek() {
  const minDate = getMinDate();
  const [liked, retweetss] = await Promise.all([
    db.query.likedTweets.findMany({
      columns: {
        firstSeenAt: true,
      },
      orderBy: desc(likedTweets.firstSeenAt),
      where: and(gte(likedTweets.firstSeenAt, minDate.toDate())),
    }),
    db.query.retweets.findMany({
      columns: {
        retweetAt: true,
      },
      orderBy: desc(retweets.retweetAt),
      where: and(gte(retweets.retweetAt, minDate.toDate())),
    }),
  ]);
  console.time("lastWeek");
  const ultimaSemana = lastWeek(liked, retweetss);
  console.timeEnd("lastWeek");
  return ultimaSemana;
}

import { db } from "$lib/db";
import { and, desc, gte, lt } from "drizzle-orm";
import { likedTweets, retweets } from "../../../../../schema";
import {
  calculateSessions,
  getInteractionTimes,
  totalFromDurations,
} from "$lib/data-processing/screenTime";
import dayjs from "dayjs";
import { likesCutoffSql } from "$lib/consts";
import { getLastWeek } from "$lib/data-processing/weekly";

export async function GET() {
  const startingFrom = dayjs()
    .tz("America/Argentina/Buenos_Aires")
    .startOf("day");
  const endsAt = startingFrom.add(24, "hour");

  const [todayTweets, last12hTweets, todayRetweets, ultimaSemana] =
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
      db.query.likedTweets.findMany({
        columns: {
          firstSeenAt: true,
          url: true,
          text: true,
        },
        where: and(
          gte(likedTweets.firstSeenAt, dayjs().subtract(12, "hour").toDate()),
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
      getLastWeek(),
    ]);

  const totalTime = totalFromDurations(
    calculateSessions(getInteractionTimes(todayTweets, todayRetweets)),
  );

  return new Response(
    JSON.stringify({
      hoy: {
        likes: todayTweets.length,
        retweets: todayRetweets.length,
        totalTime,
      },
      ultimaSemana: ultimaSemana.map((x) => ({
        ...x,
        day: x.day,
        tweets: x.tweets.length,
        retweets: x.retweets.length,
      })),
      last12hTweets,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

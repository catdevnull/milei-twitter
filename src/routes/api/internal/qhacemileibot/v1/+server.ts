import { db } from "$lib/db";
import { desc } from "drizzle-orm";
import { likedTweets, retweets } from "../../../../../schema";
import { lastWeek } from "$lib/data-processing/weekly";
import {
  calculateScreenTime,
  totalFromDurations,
} from "$lib/data-processing/screenTime";
import dayjs from "dayjs";

export async function GET() {
  const tweets = await db.query.likedTweets.findMany({
    columns: {
      firstSeenAt: true,
      url: true,
    },
    orderBy: desc(likedTweets.firstSeenAt),
  });
  const retweetss = await db.query.retweets.findMany({
    columns: {
      retweetAt: true,
      posterId: true,
      postId: true,
      posterHandle: true,
    },
    orderBy: desc(retweets.retweetAt),
  });

  const todayTweets = tweets.filter((t) =>
    dayjs(t.firstSeenAt).isAfter(
      dayjs().tz("America/Argentina/Buenos_Aires").startOf("day"),
    ),
  );

  const totalTime = totalFromDurations(calculateScreenTime(todayTweets));

  const ultimaSemana = lastWeek(tweets, retweetss).map((x) => ({
    ...x,
    day: x.day.format("YYYY-MM-DD"),
    tweets: x.tweets.length,
    retweets: x.retweets.length,
  }));

  return new Response(
    JSON.stringify({
      hoy: {
        likes: todayTweets.length,
        totalTime,
      },
      ultimaSemana,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

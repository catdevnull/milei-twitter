import type { connectDb } from "$lib/db/connectDb";
import type { Dayjs } from "dayjs";
import {
  likedTweets,
  retweets,
  type MiniLikedTweet,
  type MiniRetweet,
} from "../../schema";
import { likesCutoffSql } from "$lib/consts";
import { desc, and, gte, lte } from "drizzle-orm";
import {
  calculateSessions,
  getInteractionTimes,
  totalFromDurations,
} from "./screenTime";

export function makeMapOfDays<T>(
  days: Array<Date>,
  array: Array<T>,
  x: (arg: T) => Date,
) {
  let map = new Map<number, Array<T>>();
  for (const t of array) {
    const day = days.find((day) => {
      const y = x(t);
      return +y < +day + 24 * 60 * 60 * 1000 && y > day;
    });
    if (day) {
      const key = +day;
      let array = map.get(key);
      if (!array) {
        array = [];
        map.set(key, array);
      }
      array.push(t);
    }
  }
  return map;
}

export async function getDataForTimePeriod(
  db: Awaited<ReturnType<typeof connectDb>>,
  start: Dayjs,
  end: Dayjs,
): Promise<[Array<MiniLikedTweet>, Array<MiniRetweet>]> {
  return await Promise.all([
    db.query.likedTweets.findMany({
      columns: {
        firstSeenAt: true,
        url: true,
      },
      orderBy: desc(likedTweets.firstSeenAt),
      where: and(
        gte(likedTweets.firstSeenAt, start.toDate()),
        lte(likedTweets.firstSeenAt, end.toDate()),
        likesCutoffSql,
      ),
    }),
    db.query.retweets.findMany({
      columns: {
        retweetAt: true,
        postId: true,
        posterId: true,
        posterHandle: true,
      },
      orderBy: desc(retweets.retweetAt),
      where: and(
        gte(retweets.retweetAt, start.toDate()),
        lte(retweets.retweetAt, end.toDate()),
      ),
    }),
  ]);
}

export async function getStatsForDaysInTimePeriod(
  db: Awaited<ReturnType<typeof connectDb>>,
  start: Dayjs,
  end: Dayjs,
) {
  const days = getDaysInTimePeriod(start, end);
  console.time("query getStatsForDaysInTimePeriod");
  const [likedTweets, retweets] = await getDataForTimePeriod(
    db,
    start.startOf("day"),
    end.endOf("day"),
  );
  console.timeEnd("query getStatsForDaysInTimePeriod");

  console.time("process getStatsForDaysInTimePeriod");
  const dayDates = days.map((d) => d.toDate());

  const likedMap = makeMapOfDays(dayDates, likedTweets, (t) => t.firstSeenAt);
  const retweetedMap = makeMapOfDays(dayDates, retweets, (t) => t.retweetAt);

  const x = days.map((day) => {
    const tweets = likedMap.get(+day.toDate()) ?? [];
    const retweets = retweetedMap.get(+day.toDate()) ?? [];
    return {
      day: day.format("YYYY-MM-DD"),
      tweets,
      retweets,
      screenTime: totalFromDurations(
        calculateSessions(getInteractionTimes(tweets, retweets)),
      ),
    };
  });
  console.timeEnd("process getStatsForDaysInTimePeriod");
  return x;
}

export function getDaysInTimePeriod(start: Dayjs, end: Dayjs) {
  let days = [];
  for (
    let date = start.startOf("day");
    date.isBefore(end.endOf("day"));
    date = date.add(1, "day")
  )
    days.push(date);
  return days;
}

import type { connectDb } from "$lib/db/connectDb";
import { dayjs, likesCutoff, likesCutoffSql, type Dayjs } from "../consts.ts";
import {
  calculateSessions,
  getInteractionTimes,
  totalFromDurations,
} from "./screenTime.ts";
import {
  likedTweets,
  retweets,
  type MiniLikedTweet,
  type MiniRetweet,
} from "../../schema.ts";
import { and, desc, gte, lt } from "drizzle-orm";

export function getMinDate() {
  return dayjs
    .tz(undefined, "America/Argentina/Buenos_Aires")
    .startOf("day")
    .subtract(7, "day");
}

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

export function lastWeek(
  allLiked: Array<MiniLikedTweet>,
  allRetweets: Array<MiniRetweet>,
) {
  const today = dayjs
    .tz(undefined, "America/Argentina/Buenos_Aires")
    .startOf("day");

  const days = [
    // también cambiar en getMinDate
    today.subtract(7, "day"),
    today.subtract(6, "day"),
    today.subtract(5, "day"),
    today.subtract(4, "day"),
    today.subtract(3, "day"),
    today.subtract(2, "day"),
    today.subtract(1, "day"),
    today,
  ];

  const dayDates = days.map((d) => d.toDate());

  const likedMap = makeMapOfDays(dayDates, allLiked, (t) => t.firstSeenAt);
  const retweetedMap = makeMapOfDays(dayDates, allRetweets, (t) => t.retweetAt);

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
  return x;
}

export async function getDataForLastWeek(
  db: Awaited<ReturnType<typeof connectDb>>,
  minDate: Dayjs,
): Promise<[Array<MiniLikedTweet>, Array<MiniRetweet>]> {
  return await Promise.all([
    db.query.likedTweets.findMany({
      columns: {
        firstSeenAt: true,
        url: true,
      },
      orderBy: desc(likedTweets.firstSeenAt),
      where: and(
        gte(likedTweets.firstSeenAt, minDate.toDate()),
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
      where: and(gte(retweets.retweetAt, minDate.toDate())),
    }),
  ]);
}

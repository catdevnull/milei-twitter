import dayjs from "dayjs";
import Utc from "dayjs/plugin/utc";
import Tz from "dayjs/plugin/timezone";
dayjs.extend(Utc);
dayjs.extend(Tz);
import type { LikedTweet, MiniRetweet } from "../../schema";
import { calculateScreenTime, totalFromDurations } from "./screenTime";

export function lastWeek(
  allLiked: Array<LikedTweet>,
  allRetweets: Array<MiniRetweet>,
) {
  console.time("lastWeek");
  const today = dayjs
    .tz(undefined, "America/Argentina/Buenos_Aires")
    .startOf("day");

  const days = [
    today.subtract(7, "day"),
    today.subtract(6, "day"),
    today.subtract(5, "day"),
    today.subtract(4, "day"),
    today.subtract(3, "day"),
    today.subtract(2, "day"),
    today.subtract(1, "day"),
    today,
  ];

  let likedMap = new Map<number, Array<LikedTweet>>();
  for (const tweet of allLiked) {
    const date = dayjs(tweet.firstSeenAt);
    const day = days.find(
      (day, index) =>
        date.isAfter(day) &&
        date.isBefore(days[index + 1] ?? day.add(1, "day")),
    );
    if (day) {
      const key = +day.toDate();
      let oldArray = likedMap.get(key) ?? [];
      likedMap.set(key, [...oldArray, tweet]);
    }
  }
  let retweetedMap = new Map<number, Array<MiniRetweet>>();
  for (const tweet of allRetweets) {
    const date = dayjs(tweet.retweetAt);
    const day = days.find(
      (day, index) =>
        date.isAfter(day) &&
        date.isBefore(days[index + 1] ?? day.add(1, "day")),
    );
    if (day) {
      const key = +day.toDate();
      let oldArray = retweetedMap.get(key) ?? [];
      retweetedMap.set(key, [...oldArray, tweet]);
    }
  }

  const x = days.map((day) => {
    const tweets = likedMap.get(+day.toDate()) ?? [];
    const retweets = retweetedMap.get(+day.toDate()) ?? [];
    return {
      day: day.format("YYYY-MM-DD"),
      tweets,
      retweets,
      screenTime: totalFromDurations(calculateScreenTime(tweets)),
    };
  });
  console.timeEnd("lastWeek");
  return x;
}

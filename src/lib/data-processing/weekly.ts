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

  return days.map((day) => {
    const tweets = allLiked.filter((t) => {
      const date = dayjs(t.firstSeenAt);
      return date.isAfter(day) && date.isBefore(day.add(1, "day"));
    });
    const retweets = allRetweets.filter((t) => {
      const date = dayjs(t.retweetAt);
      return date.isAfter(day) && date.isBefore(day.add(1, "day"));
    });
    return {
      day,
      tweets,
      retweets,
      screenTime: totalFromDurations(calculateScreenTime(tweets)),
    };
  });
}

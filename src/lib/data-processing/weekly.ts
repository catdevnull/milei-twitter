import { dayjs } from "$lib/consts";
import { calculateScreenTime, totalFromDurations } from "./screenTime";

export function getMinDate() {
  return dayjs
    .tz(undefined, "America/Argentina/Buenos_Aires")
    .startOf("day")
    .subtract(7, "day");
}

type LikedTweetDate = {
  firstSeenAt: Date;
};
type RetweetDate = {
  retweetAt: Date;
};

function makeMapOfDays<T>(
  days: Array<Date>,
  array: Array<T>,
  x: (arg: T) => Date,
) {
  let map = new Map<number, Array<T>>();
  for (const t of array) {
    const day = days.find((day) => {
      const y = x(t);
      return y > day && +y < +day + 24 * 60 * 60 * 1000;
    });
    if (day) {
      const key = +day;
      let oldArray = map.get(key) ?? [];
      map.set(key, [...oldArray, t]);
    }
  }
  return map;
}

export function lastWeek(
  allLiked: Array<LikedTweetDate>,
  allRetweets: Array<RetweetDate>,
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
      screenTime: totalFromDurations(calculateScreenTime(tweets)),
    };
  });
  return x;
}

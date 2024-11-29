import { dayjs, type Dayjs } from "../consts.ts";
import {
  calculateSessions,
  getInteractionTimes,
  totalFromDurations,
} from "./screenTime.ts";
import { getDataForTimePeriod, makeMapOfDays } from "./days.ts";
import { db } from "$lib/db/index.ts";

export function getToday() {
  return dayjs.tz(undefined, "America/Argentina/Buenos_Aires").startOf("day");
}

export async function getLastWeek(today?: Dayjs) {
  today = today ?? getToday();
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

  console.time("query lastWeek");
  const [likedTweets, retweets] = await getDataForTimePeriod(
    db,
    days[0].startOf("day"),
    days[days.length - 1].endOf("day"),
  );
  console.timeEnd("query lastWeek");

  console.time("process lastWeek");
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
  console.timeEnd("process lastWeek");
  return x;
}

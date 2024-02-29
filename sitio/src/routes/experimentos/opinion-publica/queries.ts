import { db } from "$lib/db";
import { desc, and, gte } from "drizzle-orm";
import { likedTweets, retweets } from "../../../schema";
import { dayjs } from "$lib/consts";
import { makeMapOfDays } from "$lib/data-processing/weekly";
import {
  totalFromDurations,
  calculateScreenTime,
} from "$lib/data-processing/screenTime";
import { queryLastLikedTweetsScrap } from "$lib/queries/scraps";

const tz = "America/Argentina/Buenos_Aires";

export async function queryLastWeek() {
  const minDate = getMinDate();
  return await Promise.all([
    db.query.likedTweets.findMany({
      columns: {
        firstSeenAt: true,
        url: true,
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
}

function getMinDate() {
  return dayjs().tz(tz).startOf("day").subtract(7, "days");
}

export async function cosoLastWeek() {
  const [allLiked, allRetweets] = await queryLastWeek();

  const today = dayjs().tz("America/Argentina/Buenos_Aires").startOf("day");
  const days = [
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

export async function loadStuff({ setHeaders }: { setHeaders: any }) {
  const t0 = performance.now();
  const [lastUpdated, ultimaSemana] = await Promise.all([
    queryLastLikedTweetsScrap(),
    cosoLastWeek(),
  ]);
  const t1 = performance.now();
  console.log("lastUpdated+ultimaSemana", t1 - t0);

  setHeaders({
    "cache-control": "public, max-age=60",
  });

  return {
    lastUpdated,
    ultimaSemana,
  };
}

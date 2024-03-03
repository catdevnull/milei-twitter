import { bench, run } from "mitata";

import { connectDb } from "../src/lib/connectDb.ts";
import {
  lastWeek,
  getDataForLastWeek,
} from "../src/lib/data-processing/weekly.ts";
import { desc, gte, and, lt, isNotNull } from "drizzle-orm";
import { likedTweets, retweets, scraps } from "../src/schema.ts";
import { dayjs } from "../src/lib/consts.ts";

function getDbConfig() {
  const url = process.env.TURSO_CONNECTION_URL;
  if (!url) throw new Error("Falta TURSO_CONNECTION_URL");
  const dbConfig = {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  };
  return dbConfig;
}
function getMinDate() {
  return dayjs
    .tz(undefined, "America/Argentina/Buenos_Aires")
    .startOf("day")
    .subtract(7, "day");
}

const db = await connectDb(getDbConfig());

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

// bench("query most index", async () => {
//   const startingFrom = dayjs("2024-02-18").tz(
//     "America/Argentina/Buenos_Aires",
//     true,
//   );
//   const endsAt = startingFrom.add(24, "hour");

//   const [tweets, retweetss, lastUpdated, dataForWeekly] = await Promise.all([
//     db.query.likedTweets.findMany({
//       columns: {
//         firstSeenAt: true,
//         url: true,
//       },
//       where: and(
//         gte(likedTweets.firstSeenAt, startingFrom.toDate()),
//         lt(likedTweets.firstSeenAt, endsAt.toDate()),
//       ),
//       orderBy: desc(likedTweets.firstSeenAt),
//     }),
//     db.query.retweets.findMany({
//       columns: {
//         retweetAt: true,
//         posterId: true,
//         postId: true,
//         posterHandle: true,
//       },
//       where: and(
//         gte(retweets.retweetAt, startingFrom.toDate()),
//         lt(retweets.retweetAt, endsAt.toDate()),
//       ),
//       orderBy: desc(retweets.retweetAt),
//     }),
//     db.query.scraps.findFirst({
//       orderBy: desc(scraps.finishedAt),
//       where: isNotNull(scraps.totalTweetsSeen),
//     }),

//     getDataForLastWeek(db, minDate),
//   ]);

//   return [tweets, retweetss, lastUpdated, dataForWeekly];
// });

function makeMapOfDays<T>(
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
bench("dayjs week", () => {
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
  const likedMap = makeMapOfDays(dayDates, liked, (t) => t.firstSeenAt);
  const retweetedMap = makeMapOfDays(dayDates, retweetss, (t) => t.retweetAt);

  return [likedMap, retweetedMap];
});

bench("lastWeek", () => {
  return lastWeek(liked, retweetss);
});

await run();

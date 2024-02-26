import { bench, run } from "mitata";

import { connectDb } from "../src/lib/connectDb";
import {
  lastWeek,
  getDataForLastWeek,
} from "../src/lib/data-processing/weekly";
import { desc, gte, and, lt, isNotNull } from "drizzle-orm";
import { likedTweets, retweets, scraps } from "../src/schema";
import { dayjs } from "../src/lib/consts";

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

bench("query most index", async () => {
  const startingFrom = dayjs("2024-02-18").tz(
    "America/Argentina/Buenos_Aires",
    true,
  );
  const endsAt = startingFrom.add(24, "hour");

  const [tweets, retweetss, lastUpdated, dataForWeekly] = await Promise.all([
    db.query.likedTweets.findMany({
      columns: {
        firstSeenAt: true,
        url: true,
      },
      where: and(
        gte(likedTweets.firstSeenAt, startingFrom.toDate()),
        lt(likedTweets.firstSeenAt, endsAt.toDate()),
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
    db.query.scraps.findFirst({
      orderBy: desc(scraps.at),
      where: isNotNull(scraps.totalTweetsSeen),
    }),

    getDataForLastWeek(db, minDate),
  ]);

  return [tweets, retweetss, lastUpdated, dataForWeekly];
});

bench("lastWeek", () => {
  return lastWeek(liked, retweetss);
});

await run();

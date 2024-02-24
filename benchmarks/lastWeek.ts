import { bench, run } from "mitata";

import { connectDb } from "../src/lib/connectDb";
import { lastWeek } from "../src/lib/data-processing/weekly";
import { desc } from "drizzle-orm";
import { likedTweets, retweets } from "../src/schema";
import { gte } from "drizzle-orm";
import { and } from "drizzle-orm";
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

bench("lastWeek", () => {
  return lastWeek(liked, retweetss);
});

await run();

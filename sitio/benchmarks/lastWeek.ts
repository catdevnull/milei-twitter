import { bench, run } from "mitata";

import { connectDb } from "../src/lib/connectDb.ts";
import {
  lastWeek,
  getDataForLastWeek,
} from "../src/lib/data-processing/weekly.ts";
import { desc, gte, and, lt, isNotNull } from "drizzle-orm";
import { likedTweets, retweets, scraps } from "../src/schema.ts";
import { dayjs, likesCutoffSql } from "../src/lib/consts.ts";

function getMinDate() {
  return dayjs
    .tz(undefined, "America/Argentina/Buenos_Aires")
    .startOf("day")
    .subtract(7, "day");
}

const db = await connectDb({ path: process.env.DB_PATH! });

const minDate = getMinDate();
const [liked, retweetss] = await Promise.all([
  db.query.likedTweets.findMany({
    columns: {
      firstSeenAt: true,
    },
    orderBy: desc(likedTweets.firstSeenAt),
    where: and(gte(likedTweets.firstSeenAt, minDate.toDate()), likesCutoffSql),
  }),
  db.query.retweets.findMany({
    columns: {
      retweetAt: true,
    },
    orderBy: desc(retweets.retweetAt),
    where: and(gte(retweets.retweetAt, minDate.toDate())),
  }),
]);

const startingFrom = dayjs("2024-02-18").tz(
  "America/Argentina/Buenos_Aires",
  true,
);
const endsAt = startingFrom.add(24, "hour");

bench("query most index", async () => {
  const [tweets, retweetss, lastUpdated, dataForWeekly] = await Promise.all([
    db.query.likedTweets.findMany({
      columns: {
        firstSeenAt: true,
        url: true,
      },
      where: and(
        gte(likedTweets.firstSeenAt, startingFrom.toDate()),
        lt(likedTweets.firstSeenAt, endsAt.toDate()),
        likesCutoffSql,
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
      orderBy: desc(scraps.finishedAt),
      where: isNotNull(scraps.totalTweetsSeen),
    }),

    getDataForLastWeek(db, minDate),
  ]);

  return [tweets, retweetss, lastUpdated, dataForWeekly];
});

bench("liked tweets", async () => {
  return await db.query.likedTweets.findMany({
    columns: {
      firstSeenAt: true,
      url: true,
    },
    where: and(
      gte(likedTweets.firstSeenAt, startingFrom.toDate()),
      lt(likedTweets.firstSeenAt, endsAt.toDate()),
      likesCutoffSql,
    ),
    orderBy: desc(likedTweets.firstSeenAt),
  });
});
bench("retweets", async () => {
  return await db.query.retweets.findMany({
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
  });
});
bench("last scrap", async () => {
  return await db.query.scraps.findFirst({
    orderBy: desc(scraps.finishedAt),
    where: isNotNull(scraps.totalTweetsSeen),
  });
});
bench("querylastweek->likedTweets", async () => {
  return await db.query.likedTweets.findMany({
    columns: {
      firstSeenAt: true,
    },
    orderBy: desc(likedTweets.firstSeenAt),
    where: and(gte(likedTweets.firstSeenAt, minDate.toDate()), likesCutoffSql),
  });
});
bench("querylastweek->retweets", async () => {
  return await db.query.retweets.findMany({
    columns: {
      retweetAt: true,
    },
    orderBy: desc(retweets.retweetAt),
    where: and(gte(retweets.retweetAt, minDate.toDate())),
  });
});
bench("lastWeek", () => {
  return lastWeek(liked, retweetss);
});

await run();

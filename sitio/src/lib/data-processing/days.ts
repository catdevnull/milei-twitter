import type { connectDb } from "$lib/db/connectDb";
import type { Dayjs } from "dayjs";
import {
  likedTweets,
  retweets,
  type MiniLikedTweet,
  type MiniRetweet,
} from "../../schema";
import { likesCutoffSql } from "$lib/consts";
import { desc, and, gte, lte } from "drizzle-orm";

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

export async function getDataForTimePeriod(
  db: Awaited<ReturnType<typeof connectDb>>,
  start: Dayjs,
  end: Dayjs,
): Promise<[Array<MiniLikedTweet>, Array<MiniRetweet>]> {
  return await Promise.all([
    db.query.likedTweets.findMany({
      columns: {
        firstSeenAt: true,
        url: true,
      },
      orderBy: desc(likedTweets.firstSeenAt),
      where: and(
        gte(likedTweets.firstSeenAt, start.toDate()),
        lte(likedTweets.firstSeenAt, end.toDate()),
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
      where: and(
        gte(retweets.retweetAt, start.toDate()),
        lte(retweets.retweetAt, end.toDate()),
      ),
    }),
  ]);
}

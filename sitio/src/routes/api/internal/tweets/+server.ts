// ¡EY! Esta API no es estable, no la uses.

import { db } from "$lib/db";
import { error } from "@sveltejs/kit";
import { and, asc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import * as schema from "../../../../schema.js";
import type { Tweet, TweetsResponse } from "./types.js";

const zParams = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
});

export async function GET({ url }) {
  const params = zParams.safeParse({
    start: url.searchParams.get("start"),
    end: url.searchParams.get("end"),
  });
  if (!params.success) {
    error(400, "invalid query params");
  }

  const [likedTweets, retweets] = await Promise.all([
    db.query.likedTweets.findMany({
      columns: {
        firstSeenAt: true,
        url: true,
        text: true,
      },
      where: and(
        gte(schema.likedTweets.firstSeenAt, params.data.start),
        lte(schema.likedTweets.firstSeenAt, params.data.end),
      ),
      orderBy: asc(schema.likedTweets.firstSeenAt),
    }),
    db.query.retweets.findMany({
      columns: {
        retweetAt: true,
        posterId: true,
        postId: true,
        posterHandle: true,
        text: true,
      },
      where: and(
        gte(schema.likedTweets.firstSeenAt, params.data.start),
        lte(schema.likedTweets.firstSeenAt, params.data.end),
      ),
      orderBy: asc(schema.likedTweets.firstSeenAt),
    }),
  ]);

  let map = new Map<string, Tweet>();
  for (const likedTweet of likedTweets) {
    map.set(likedTweet.url, {
      aproximateAt: likedTweet.firstSeenAt,
      text: likedTweet.text,
      url: likedTweet.url,
      liked: true,
      retweeted: false,
    });
  }
  for (const retweet of retweets) {
    const url = `https://twitter.com/${retweet.posterHandle}/status/${retweet.postId}`;
    const prev = map.get(url);
    if (prev) {
      map.set(url, {
        ...prev,
        aproximateAt: retweet.retweetAt,
        retweeted: true,
      });
    } else {
      map.set(url, {
        aproximateAt: retweet.retweetAt,
        text: retweet.text,
        url,
        liked: false,
        retweeted: true,
      });
    }
  }

  const tweets = [...map.values()].sort(
    (a, b) => +a.aproximateAt - +b.aproximateAt,
  );
  const res: TweetsResponse = { tweets };
  return new Response(JSON.stringify(res));
}

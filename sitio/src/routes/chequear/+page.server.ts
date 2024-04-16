import { db } from "$lib/db";
import { eq, like } from "drizzle-orm";
import { historicLikedTweets, likedTweets, retweets } from "../../schema";
import type { PageServerLoad } from "../$types";
import { parsearLinkDeTwitter } from "$lib/consts";

type FoundLikedMatch = {
  aproxLikedAt: Date;
  url: string;
};

export const load: PageServerLoad = async ({ url }) => {
  const query = url.searchParams.get("url");
  if (!query) return { chequeoIntentado: false };
  const parsedQuery = parsearLinkDeTwitter(query);
  if (!parsedQuery) {
    return { chequeoIntentado: true, error: "La URL no es de un tweet" };
  } else if ("error" in parsedQuery) {
    return { chequeoIntentado: true, error: parsedQuery.error };
  }
  let match: FoundLikedMatch | null = null;
  let linkToDate = true;
  const fromLiked = await db.query.likedTweets.findFirst({
    columns: {
      firstSeenAt: true,
      url: true,
    },
    where: like(likedTweets.url, `%/${parsedQuery.id}`),
  });
  if (fromLiked) {
    match = {
      aproxLikedAt: fromLiked.firstSeenAt,
      url: fromLiked.url,
    };
  } else {
    const fromHistoricLiked = await db.query.historicLikedTweets.findFirst({
      where: eq(historicLikedTweets.postId, parsedQuery.id),
    });
    if (fromHistoricLiked) {
      match = {
        aproxLikedAt: fromHistoricLiked.estimatedLikedAt,
        url: fromHistoricLiked.url,
      };
      linkToDate = false;
    }
  }

  if (match) {
    const parsedFound = parsearLinkDeTwitter(match?.url);
    if (!parsedFound || "error" in parsedFound) {
      throw new Error(`error en parsedFound ${parsedFound}`);
    }

    const fromRetweet = await db.query.retweets.findFirst({
      where: eq(retweets.postId, parsedQuery.id),
    });

    return {
      chequeoIntentado: true,

      found: match,
      retweet: fromRetweet,
      linkToDate,

      parsedQuery,
      parsedFound,
    };
  } else {
    return { chequeoIntentado: true };
  }
};

import { db } from "$lib/db";
import { and, eq, like } from "drizzle-orm";
import { historicLikedTweets, likedTweets, retweets } from "../../schema";
import type { PageServerLoad } from "../$types";
import { likesCutoffSql, parsearLinkDeTwitter } from "$lib/consts";

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
  const likeMatch = await findLikedTweet(parsedQuery.id);

  const retweetMatch = await db.query.retweets.findFirst({
    where: eq(retweets.postId, parsedQuery.id),
  });

  if (likeMatch) {
    const parsedFound = parsearLinkDeTwitter(likeMatch?.match.url);
    if (!parsedFound || "error" in parsedFound) {
      throw new Error(`error en parsedFound ${parsedFound}`);
    }

    return {
      chequeoIntentado: true,

      like: likeMatch.match,
      linkToDate: !likeMatch.isfromHistoric,
      retweet: retweetMatch,

      parsedQuery,
      parsedFound,
    };
  } else if (retweetMatch) {
    return {
      chequeoIntentado: true,

      retweet: retweetMatch,

      parsedQuery,
    };
  } else {
    return { chequeoIntentado: true };
  }
};

/**
 * Busca en la base de datos un tweet likeado, también buscando en el dataset
 * de likes historicos.
 */
async function findLikedTweet(id: string) {
  let match: FoundLikedMatch | null = null;
  const fromLiked = await db.query.likedTweets.findFirst({
    columns: {
      firstSeenAt: true,
      url: true,
    },
    where: and(like(likedTweets.url, `%/${id}`), likesCutoffSql),
  });
  if (fromLiked) {
    return {
      match: {
        aproxLikedAt: fromLiked.firstSeenAt,
        url: fromLiked.url,
      },
      isfromHistoric: false,
    };
  } else {
    const fromHistoricLiked = await db.query.historicLikedTweets.findFirst({
      where: eq(historicLikedTweets.postId, id),
    });
    if (fromHistoricLiked) {
      return {
        match: {
          aproxLikedAt: fromHistoricLiked.estimatedLikedAt,
          url: fromHistoricLiked.url,
        },
        isfromHistoric: true,
      };
    }
  }
  return null;
}

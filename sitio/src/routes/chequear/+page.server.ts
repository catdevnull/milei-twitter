import { db } from "$lib/db";
import { eq, like } from "drizzle-orm";
import { historicLikedTweets, likedTweets } from "../../schema";
import type { PageServerLoad } from "../$types";
import { parsearLinkDeTwitter } from "$lib/consts";

type FoundLikedMatch = {
  aproxLikedAt: Date;
  url: string;
};

export const load: PageServerLoad = async ({ url }) => {
  const query = url.searchParams.get("url");
  if (!query) return {};
  const parsedTwit = parsearLinkDeTwitter(query);
  if (!parsedTwit) {
    return { error: "La URL no es de un tweet" };
  } else if ("error" in parsedTwit) {
    return { error: parsedTwit.error };
  }
  let match: FoundLikedMatch | null = null;
  let linkToDate = true;
  const fromLiked = await db.query.likedTweets.findFirst({
    columns: {
      firstSeenAt: true,
      url: true,
    },
    where: like(likedTweets.url, `%/${parsedTwit.id}`),
  });
  if (fromLiked) {
    match = {
      aproxLikedAt: fromLiked.firstSeenAt,
      url: fromLiked.url,
    };
  } else {
    const fromHistoricLiked = await db.query.historicLikedTweets.findFirst({
      where: eq(historicLikedTweets.postId, parsedTwit.id),
    });
    if (fromHistoricLiked) {
      match = {
        aproxLikedAt: fromHistoricLiked.estimatedLikedAt,
        url: fromHistoricLiked.url,
      };
      linkToDate = false;
    }
  }
  return {
    found: match,
    linkToDate,
  };
};

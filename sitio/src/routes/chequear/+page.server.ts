import { db } from "$lib/db";
import { eq } from "drizzle-orm";
import { likedTweets } from "../../schema";
import type { PageServerLoad } from "../$types";

const simpleTwitterPathRegexp = /\/[^/]+\/status\/[0-9]+\/?/;

const validarYParsearLinkDeTwitter = (s: string) => {
  try {
    const url = new URL(s);
    if (
      (url.hostname === "x.com" || url.hostname === "twitter.com") &&
      url.pathname.match(simpleTwitterPathRegexp)
    ) {
      return `${url.origin.replace("x.com", "twitter.com")}${url.pathname}`;
    } else {
      return null;
    }
  } catch {
    return null;
  }
};

export const load: PageServerLoad = async ({ url }) => {
  const query = url.searchParams.get("url");
  if (!query) return {};
  const parsedTwit = validarYParsearLinkDeTwitter(query);
  if (!parsedTwit) {
    return { error: "La URL del twit está mal construida" };
  }
  return {
    found: await db.query.likedTweets.findFirst({
      columns: {
        firstSeenAt: true,
        url: true,
      },
      where: eq(likedTweets.url, parsedTwit),
    }),
  };
};

import { db } from "$lib/db";
import { like } from "drizzle-orm";
import { likedTweets } from "../../schema";
import type { PageServerLoad } from "../$types";

const simpleTwitterPathRegexp = /\/[^/]+\/status\/([0-9]+)\/?/;

const parsearLinkDeTwitter = (
  s: string,
): { error: string } | { id: string } | null => {
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return { error: "La URL es inválida" };
  }
  if (!(url.hostname === "x.com" || url.hostname === "twitter.com"))
    return { error: "El link no es de Twitter" };
  const matches = url.pathname.match(simpleTwitterPathRegexp);
  if (matches) {
    const id = matches[1];
    return { id };
  } else {
    return null;
  }
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
  return {
    found: await db.query.likedTweets.findFirst({
      columns: {
        firstSeenAt: true,
        url: true,
      },
      where: like(likedTweets.url, `%/${parsedTwit.id}`),
    }),
  };
};

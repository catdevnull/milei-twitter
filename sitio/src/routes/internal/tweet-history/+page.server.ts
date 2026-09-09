import { dev } from "$app/environment";
import { db } from "$lib/db";
import { fail, redirect } from "@sveltejs/kit";
import { asc, desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { scraperTokens, tweetSnapshots } from "../../../schema";
import type { Actions, PageServerLoad } from "./$types";

const COOKIE_NAME = "tweet-history-session";

function sessionToken(token: string) {
  return createHash("sha256")
    .update(`milei-twitter:tweet-history:${token}`)
    .digest("hex");
}

export const load: PageServerLoad = async ({ cookies, url }) => {
  const cookie = cookies.get(COOKIE_NAME);
  const tokens = cookie
    ? await db.select({ token: scraperTokens.token }).from(scraperTokens)
    : [];
  if (!cookie || !tokens.some(({ token }) => sessionToken(token) === cookie)) {
    return { authorized: false as const };
  }
  const latestRows = await db
    .selectDistinctOn([tweetSnapshots.tweetId], {
      tweetId: tweetSnapshots.tweetId,
      tweetedAt: tweetSnapshots.tweetedAt,
      scrapedAt: tweetSnapshots.scrapedAt,
      favoriteCount: tweetSnapshots.favoriteCount,
      viewsCount: tweetSnapshots.viewsCount,
      tweetJson: tweetSnapshots.tweetJson,
    })
    .from(tweetSnapshots)
    .orderBy(tweetSnapshots.tweetId, desc(tweetSnapshots.scrapedAt));

  const tweets = latestRows
    .map((row) => ({
      ...row,
      text:
        typeof (row.tweetJson as { full_text?: unknown })?.full_text ===
        "string"
          ? (row.tweetJson as { full_text: string }).full_text
          : "",
    }))
    .sort(
      (left, right) => right.tweetedAt.getTime() - left.tweetedAt.getTime(),
    );
  const requestedTweetId = url.searchParams.get("tweet");
  const selectedTweetId = tweets.some(
    (tweet) => tweet.tweetId === requestedTweetId,
  )
    ? requestedTweetId!
    : tweets[0]?.tweetId;
  const history = selectedTweetId
    ? await db
        .select({
          scrapedAt: tweetSnapshots.scrapedAt,
          favoriteCount: tweetSnapshots.favoriteCount,
          viewsCount: tweetSnapshots.viewsCount,
        })
        .from(tweetSnapshots)
        .where(eq(tweetSnapshots.tweetId, selectedTweetId))
        .orderBy(asc(tweetSnapshots.scrapedAt))
    : [];

  return { authorized: true as const, tweets, selectedTweetId, history };
};

export const actions: Actions = {
  login: async ({ cookies, request }) => {
    const submitted = String((await request.formData()).get("token") ?? "");
    const match = await db.query.scraperTokens.findFirst({
      where: eq(scraperTokens.token, submitted),
    });
    if (!match) return fail(401, { incorrect: true });
    cookies.set(COOKIE_NAME, sessionToken(submitted), {
      path: "/internal/tweet-history",
      httpOnly: true,
      sameSite: "strict",
      secure: !dev,
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect(303, "/internal/tweet-history");
  },
  logout: async ({ cookies }) => {
    cookies.delete(COOKIE_NAME, { path: "/internal/tweet-history" });
    redirect(303, "/internal/tweet-history");
  },
};

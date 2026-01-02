import { db } from "$lib/db";
import { desc, ilike, or, sql } from "drizzle-orm";
import { retweets } from "../../../../schema";
import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return json({ results: [], error: "Query must be at least 2 characters" });
  }

  const searchPattern = `%${query}%`;

  const results = await db.query.retweets.findMany({
    columns: {
      retweetAt: true,
      posterId: true,
      posterHandle: true,
      postId: true,
      text: true,
    },
    where: or(
      ilike(retweets.text, searchPattern),
      ilike(retweets.posterHandle, searchPattern)
    ),
    orderBy: desc(retweets.retweetAt),
    limit: 25,
  });

  return json(
    { results },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    }
  );
};


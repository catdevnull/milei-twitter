import { db } from "$lib/db";
import { and, desc, gt, isNotNull, sql } from "drizzle-orm";
import { likedTweets, scraps } from "../../../../schema";

export async function GET() {
  let errors: Array<string> = [];
  const lastScrap = await db.query.scraps.findFirst({
    orderBy: desc(scraps.finishedAt),
    where: and(
      isNotNull(scraps.totalTweetsSeen),
      gt(scraps.totalTweetsSeen, 0),
    ),
  });
  const lastScrapWithLikes = await db
    .select({
      finishedAt: scraps.finishedAt,
      count: sql`(select count(*) from ${likedTweets} where ${scraps.id} = ${likedTweets.scrapId}) as c`,
    })
    .from(scraps)
    .orderBy(desc(scraps.finishedAt))
    .groupBy()
    .limit(1)
    .where(sql`c > 0`);

  if (lastScrap) {
    const delta = +new Date() - +lastScrap.finishedAt;
    if (delta > 10 * 60 * 1000) {
      errors.push(`último scrap hace ${delta}ms (>10min)`);
    }
    if (lastScrap.totalTweetsSeen && lastScrap.totalTweetsSeen < 10) {
      errors.push(`solo ${lastScrap.totalTweetsSeen} tweets vistos (<10)`);
    }
  } else errors.push("no hay scraps");
  if (lastScrapWithLikes && lastScrapWithLikes.length > 0) {
    const delta = +new Date() - +lastScrapWithLikes[0].finishedAt;
    if (delta > 1.5 * 60 * 60 * 1000) {
      errors.push(
        `último scrap con ${lastScrapWithLikes[0].count} likes hace ${delta}ms (>1:30h)`,
      );
    }
    // TODO: especificamente ver el output que nos importa que serían los likes
    // no tengo claro como se lograría eso, quizás agregar un lastSeenAt en los likes y ver que siempre haya likes con un lastSeenAt reciente?
  } else errors.push("no hay scraps con likes");

  if (errors.length) {
    return new Response(`errors:\n${errors.map((e) => `- ${e}`).join("\n")}`, {
      status: 500,
    });
  } else {
    return new Response(`ok (last scrap at ${lastScrap?.finishedAt})`);
  }
}

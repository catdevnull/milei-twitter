import { db } from "$lib/db";
import { desc, isNotNull } from "drizzle-orm";
import { likedTweets, retweets, scraps } from "../../../../schema";
import { lastWeek } from "$lib/data-processing/weekly";
import {
  calculateScreenTime,
  totalFromDurations,
} from "$lib/data-processing/screenTime";
import dayjs from "dayjs";

export async function GET() {
  let errors: Array<string> = [];
  const lastScrap = await db.query.scraps.findFirst({
    orderBy: desc(scraps.at),
    where: isNotNull(scraps.totalTweetsSeen),
  });
  if (lastScrap) {
    const delta = +new Date() - +lastScrap.at;
    if (delta > 10 * 60 * 1000) {
      errors.push(`último scrap hace ${delta}ms (>10min)`);
    }
    if (lastScrap.totalTweetsSeen && lastScrap.totalTweetsSeen < 10) {
      errors.push(`solo ${lastScrap.totalTweetsSeen} tweets vistos (<10)`);
    }
    // TODO: especificamente ver el output que nos importa que serían los likes
    // no tengo claro como se lograría eso, quizás agregar un lastSeenAt en los likes y ver que siempre haya likes con un lastSeenAt reciente?
  } else errors.push("no hay scraps");

  if (errors.length) {
    return new Response(`errors:\n${errors.map((e) => `- ${e}`).join("\n")}`, {
      status: 500,
    });
  } else {
    return new Response(`ok (last scrap at ${lastScrap?.at})`);
  }
}

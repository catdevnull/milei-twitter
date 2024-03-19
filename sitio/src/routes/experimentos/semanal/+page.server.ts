import { db } from "$lib/db";
import { and, asc, desc, gte, isNotNull, lt, lte } from "drizzle-orm";
import { likedTweets, retweets, scraps } from "../../../schema";
import type { PageServerLoad } from "./../../$types";
import { dayjs } from "$lib/consts";
import { error } from "@sveltejs/kit";
import { queryWeek } from "$lib/data-processing/queryWeekly";

const tz = "America/Argentina/Buenos_Aires";

function getStartingFrom(query: string) {
  switch (query) {
    case "last-24h":
      return dayjs().subtract(24, "hour");
    default:
      if (!query.startsWith("date:")) error(400, "Query imposible");
      try {
        const dateStr = query.slice(5);
        const date = dayjs(dateStr, "YYYY-MM-DD").tz(tz, true);
        return date;
      } catch {
        error(400, "Query imposible");
      }
  }
}

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  const query =
    url.searchParams.get("q") ?? "date:" + dayjs().tz(tz).format("YYYY-MM-DD");
  const startingFrom = getStartingFrom(query);

  const t0 = performance.now();
  const [ultimaSemana] =
    await Promise.all([
      queryWeek(startingFrom),
    ]);
  const t1 = performance.now();
  console.log("queries", t1 - t0);

  setHeaders({
    "cache-control": "public, max-age=60",
  });

  return {
    start: startingFrom.toDate(),
    ultimaSemana,
    query,
  };
};


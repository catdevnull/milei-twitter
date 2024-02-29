import { db } from "$lib/db";
import { desc, isNotNull } from "drizzle-orm";
import { scraps } from "../../../../schema";
import type { PageServerLoad } from "./$types";
import { queryLastWeek } from "$lib/data-processing/queryWeekly";

export const load: PageServerLoad = async ({ setHeaders }) => {
  const t0 = performance.now();
  const [lastUpdated, ultimaSemana] = await Promise.all([
    db.query.scraps.findFirst({
      orderBy: desc(scraps.finishedAt),
      where: isNotNull(scraps.totalTweetsSeen),
    }),
    queryLastWeek(),
  ]);
  const t1 = performance.now();
  console.log("lastUpdated+ultimaSemana", t1 - t0);

  setHeaders({
    "cache-control": "public, max-age=60",
  });

  return {
    lastUpdated,
    ultimaSemana,
  };
};

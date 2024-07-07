import { db } from "$lib/db";
import type { PageServerLoad } from "./$types";
import { dayjs } from "$lib/consts";
import { getStatsForDaysInTimePeriod } from "$lib/data-processing/days";

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({
    "cache-control": "public, max-age=60",
  });

  return {
    january: await getStatsForDaysInTimePeriod(
      db,
      dayjs("2024-03-01"),
      dayjs("2024-03-31"),
    ),
  };
};

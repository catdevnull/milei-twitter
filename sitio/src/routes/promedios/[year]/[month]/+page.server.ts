import { db } from "$lib/db";
import type { PageServerLoad } from "./$types";
import { dayjs } from "$lib/consts";
import { getStatsForDaysInTimePeriod } from "$lib/data-processing/days";
import { error } from "@sveltejs/kit";

const map = new Map([
  ["enero", 1],
  ["febrero", 2],
  ["marzo", 3],
  ["abril", 4],
  ["mayo", 5],
  ["junio", 6],
  ["julio", 7],
  ["agosto", 8],
  ["septiembre", 9],
  ["octubre", 10],
  ["noviembre", 11],
  ["diciembre", 12],
]);

export const load: PageServerLoad = async ({ setHeaders, params }) => {
  let year;
  try {
    year = parseInt(params.year);
  } catch {
    error(400, "wtf");
  }
  const month = map.get(params.month);
  if (!month) {
    error(400, "mes inválido");
  }

  if (year < 2000 || month < 0 || year > 2090 || month > 11) {
    error(400, "invalid date");
  }

  const start = dayjs(`${year}-${month}-01`);
  const end = start.endOf("month");

  setHeaders({
    "cache-control": "public, max-age=60",
  });

  const monthData = await getStatsForDaysInTimePeriod(db, start, end);

  if (monthData.every((d) => d.retweets.length == 0 && d.tweets.length == 0)) {
    error(404, "No tenemos datos para ese mes");
  }

  return {
    start: start.toDate(),
    end: end.toDate(),
    monthData,
  };
};

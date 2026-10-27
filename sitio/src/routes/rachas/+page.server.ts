import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  getInactivityRanking,
  getWeeklyInactivity,
} from "$lib/queries/inactivity";
import { getInactivityPeriod } from "$lib/data-processing/inactivityPeriod";

export const load: PageServerLoad = async ({ url }) => {
  let inactivityPeriod;
  try {
    inactivityPeriod = getInactivityPeriod(url.searchParams);
  } catch (err) {
    error(
      400,
      err instanceof Error ? err.message : "Rango de fechas inválido.",
    );
  }
  const [inactivityRanking, weeklyInactivity] = await Promise.all([
    getInactivityRanking(inactivityPeriod.end, inactivityPeriod.start),
    getWeeklyInactivity(inactivityPeriod.end, inactivityPeriod.start),
  ]);
  return { inactivityRanking, inactivityPeriod, weeklyInactivity };
};

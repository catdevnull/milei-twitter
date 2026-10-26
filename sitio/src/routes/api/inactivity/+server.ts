import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getInactivityPeriod } from "$lib/data-processing/inactivityPeriod";
import { getInactivityRanking } from "$lib/queries/inactivity";

export const GET: RequestHandler = async ({ url }) => {
  let period;
  try {
    period = getInactivityPeriod(url.searchParams);
  } catch (err) {
    error(400, err instanceof Error ? err.message : "Rango inválido.");
  }
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const until = Number(url.searchParams.get("until") ?? +period.end);
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(until) ||
    until < 0 ||
    until > +period.end
  ) {
    error(400, "Paginación inválida.");
  }
  const rows = await getInactivityRanking(
    new Date(until),
    period.start,
    101,
    offset,
  );
  return json({
    streaks: rows.slice(0, 100),
    hasMore: rows.length > 100,
    until,
  });
};

import { db } from "$lib/db";
import { getDataForLastWeek, getMinDate, lastWeek } from "./weekly";

export async function queryLastWeek() {
  const minDate = getMinDate();
  const [liked, retweetss] = await getDataForLastWeek(db, minDate);
  console.time("lastWeek");
  const ultimaSemana = lastWeek(liked, retweetss);
  console.timeEnd("lastWeek");
  return ultimaSemana;
}

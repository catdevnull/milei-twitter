import { db } from "$lib/db";
import { type Dayjs } from "$lib/consts";
import { getDataForLastWeek, getMinDate, week, lastWeek } from "./weekly";

export async function queryWeek(date: Dayjs) {
  const minDate = getMinDate();
  const [liked, retweetss] = await getDataForLastWeek(db, minDate);
  console.time("lastWeek");
  const ultimaSemana = week(date, liked, retweetss);
  console.timeEnd("lastWeek");
  return ultimaSemana;
}

export async function queryLastWeek() {
  const minDate = getMinDate();
  const [liked, retweetss] = await getDataForLastWeek(db, minDate);
  console.time("lastWeek");
  const ultimaSemana = lastWeek(liked, retweetss);
  console.timeEnd("lastWeek");
  return ultimaSemana;
}

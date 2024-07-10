import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { dayjs } from "$lib/consts";
import { dateToMonthString } from "./[year]/[month]/months";
export const GET: RequestHandler = async ({}) => {
  const today = dayjs();
  redirect(302, `/promedios/${today.year()}/${dateToMonthString(today)}`);
};

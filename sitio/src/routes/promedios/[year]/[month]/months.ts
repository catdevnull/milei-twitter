import type { Dayjs } from "dayjs";

export const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function dateToMonthString(date: Dayjs) {
  return months[date.month()];
}

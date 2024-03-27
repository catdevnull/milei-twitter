export const JMILEI_ID = "4020276615";
export const JMILEI_HANDLE = "jmilei";

import dayjs, { type Dayjs } from "dayjs";
import CustomParseFormat from "dayjs/plugin/customParseFormat";
import Utc from "dayjs/plugin/utc";
import Tz from "dayjs/plugin/timezone";
dayjs.extend(CustomParseFormat);
dayjs.extend(Utc);
dayjs.extend(Tz);

export { dayjs };
export type { Dayjs };

export const tz = "America/Argentina/Buenos_Aires";

export const timeFormatter = Intl.DateTimeFormat("es-AR", {
  timeStyle: "medium",
  timeZone: tz,
});
export const dateFormatter = Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  weekday: "short",
  month: "short",
  timeZone: tz,
});

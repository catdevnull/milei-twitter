export { JMILEI_HANDLE, JMILEI_ID } from "api/consts.ts";

import dayjs, { type Dayjs } from "dayjs";
import CustomParseFormat from "dayjs/plugin/customParseFormat.js";
import Utc from "dayjs/plugin/utc.js";
import Tz from "dayjs/plugin/timezone.js";
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
  year: "numeric",
  timeZone: tz,
});

export { parsearLinkDeTwitter } from "../../../common/parsearLinkDeTwitter.js";

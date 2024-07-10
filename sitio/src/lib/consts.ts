export { JMILEI_HANDLE, JMILEI_ID } from "api/consts.ts";

import dayjs, { type Dayjs } from "dayjs";
import CustomParseFormat from "dayjs/plugin/customParseFormat.js";
import Utc from "dayjs/plugin/utc.js";
import Tz from "dayjs/plugin/timezone.js";
import { lt } from "drizzle-orm";
import { likedTweets } from "../schema.js";
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
export const longDateFormatter = Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  // weekday: "long",
  month: "long",
  year: "numeric",
  timeZone: tz,
});

export { parsearLinkDeTwitter } from "../../../common/parsearLinkDeTwitter.js";

// Define cuando simulamos que paramos de poder capturar likes. Esto es porque
// Twitter hizo privados los likes[1] de todo el mundo. (Milei podría también
// en cualquier momento ocultar sus likes, pero nunca lo hizo).
// [1]: https://x.com/wanghaofei/status/1793096366132195529
export const likesCutoff: { cutAt: Date } = {
  cutAt: new Date("2024-06-12T18:00:00.000Z"),
};
export const likesCutoffSql = likesCutoff
  ? lt(likedTweets.firstSeenAt, likesCutoff.cutAt)
  : undefined;

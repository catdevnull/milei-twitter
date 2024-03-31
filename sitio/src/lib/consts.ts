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
  year: "numeric",
  timeZone: tz,
});

const simpleTwitterPathRegexp = /\/[^/]+\/status\/([0-9]+)\/?/;

export const parsearLinkDeTwitter = (
  s: string,
): { error: string } | { id: string } | null => {
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return { error: "La URL es inválida" };
  }
  if (!(url.hostname === "x.com" || url.hostname === "twitter.com"))
    return { error: "El link no es de Twitter" };
  const matches = url.pathname.match(simpleTwitterPathRegexp);
  if (matches) {
    const id = matches[1];
    return { id };
  } else {
    return null;
  }
};

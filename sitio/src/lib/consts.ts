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

const simpleTwitterPathRegexp = /\/[^/]+\/status\/([0-9]+)\/?/;
const usernameTwitterPathRegexp = /^\/(\w+)\/status\//i;

export const parsearLinkDeTwitter = (
  s: string,
): { error: string } | { id: string; username?: string } | null => {
  let url: URL;
  try {
    if (s.startsWith("x.com") || s.startsWith("twitter.com"))
      s = `https://${s}`;
    url = new URL(s);
  } catch {
    return { error: "La URL es inválida" };
  }
  if (!(url.hostname === "x.com" || url.hostname === "twitter.com"))
    return { error: "El link no es de Twitter" };
  const matches = url.pathname.match(simpleTwitterPathRegexp);
  if (matches) {
    const id = matches[1];
    let username: undefined | string;

    const usernameMatches = url.pathname.match(usernameTwitterPathRegexp);
    if (usernameMatches) username = usernameMatches[1];

    return { id, username };
  } else {
    return null;
  }
};

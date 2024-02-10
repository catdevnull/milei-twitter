import type { CookieParam, CookieSameSite } from "puppeteer";

import { env } from "$env/dynamic/private";

// exportado de la extension "editthiscookie" https://www.editthiscookie.com/
const cookiesEnv = env.COOKIES_JSON;
if (!cookiesEnv) throw new Error("faltan cookies para el scraper");

const cookies: CookieParam[] = JSON.parse(cookiesEnv).map(
  (x: any): CookieParam => {
    const sameSiteBindings: { [key: string]: CookieSameSite } = {
      no_restriction: "None",
      lax: "Lax",
    };
    return {
      ...x,
      partitionKey: x.partitionKey === null ? "" : x.partitionKey,
      sameSite: sameSiteBindings[x.sameSite],
    };
  },
);
export default cookies;

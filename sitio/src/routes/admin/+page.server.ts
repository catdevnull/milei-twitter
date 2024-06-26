import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { env } from "$env/dynamic/private";
import { db } from "$lib/db";
import * as schema from "../../schema";
import { desc } from "drizzle-orm";
import generate from "boring-name-generator";
import { redirectIfNotLoggedIn } from "$lib/login";
import { nanoid } from "nanoid";
export const load: PageServerLoad = async ({ cookies }) => {
  redirectIfNotLoggedIn(cookies);

  const scraps = await db.query.scraps.findMany({
    orderBy: desc(schema.scraps.finishedAt),
    // with: {
    //   likedTweets: true,
    // },
    limit: 200,
  });
  const cuentas = await db.query.cuentas.findMany({});
  const scraperTokens = await db.query.scraperTokens.findMany({});

  return { scraps, cuentas, scraperTokens };
};

export const actions: Actions = {
  addAccount: async ({ cookies, request }) => {
    redirectIfNotLoggedIn(cookies);

    const data = await request.formData();
    const authToken = data.get("auth_token");
    const ct0 = data.get("ct0");

    if (!authToken || !authToken.toString() || !ct0 || !ct0.toString()) {
      return fail(400, { error: "falta algun token" });
    }

    const dataObj: schema.TokenAccountData = {
      auth_token: authToken.toString(),
      ct0: ct0.toString(),
    };
    const json = JSON.stringify(dataObj);

    await db.insert(schema.cuentas).values({
      id: generate().spaced,
      accountDataJson: json,
    });
  },
  newScraperToken: async ({ cookies, request }) => {
    redirectIfNotLoggedIn(cookies);

    const dataObj: schema.ScraperToken = {
      token: nanoid(),
    };

    await db.insert(schema.scraperTokens).values(dataObj);
  },
};

import { Scraper } from "@catdevnull/twitter-scraper";
import { Cookie } from "tough-cookie";
import { accountsDb } from "./dbs/index.ts";
import * as accountsSchema from "./dbs/accounts/schema.ts";
import escapeStringRegexp from "escape-string-regexp";
import { readFile } from "node:fs/promises";
import { and, eq, isNull } from "drizzle-orm";

export async function addAccounts(format: string) {
  let regexp = escapeStringRegexp(format)
    .replace("username", `(?<username>.*)`)
    .replace("password", `(?<password>.*)`)
    .replace("email", `(?<email>.*)`)
    .replace("emailPassword", `(?<emailPassword>.*)`)
    .replace("authToken", `(?<authToken>.*)`)
    .replace("twoFactorSecret", `(?<twoFactorSecret>.*)`);
  const exp = new RegExp(regexp);
  const csv = await readFile("/dev/stdin", "utf-8");
  const accounts = csv
    .split(/\r?\n/g)
    .filter((s) => !!s)
    .map((line, index) => {
      const values = line.match(exp)?.groups;
      if (!values) {
        throw new Error(
          `Couldn't match line ${index + 1} with regexp \`${regexp}\``
        );
      }
      const {
        authToken,
        email,
        emailPassword,
        password,
        username,
        twoFactorSecret,
      } = values;
      return {
        username,
        password,
        email,
        emailPassword,
        authToken,
        twoFactorSecret,
      };
    });

  for (const account of accounts) {
    const scraper = new Scraper();

    {
      const existingSession = await accountsDb.query.sessions.findFirst({
        where: (sessions) => and(eq(sessions.username, account.username)),
      });
      if (existingSession) {
        if (existingSession.lastFailedAt !== null) {
          await accountsDb
            .delete(accountsSchema.sessions)
            .where(eq(accountsSchema.sessions.id, existingSession.id));
        } else {
          console.info(
            `Skipping @${account.username} because we already have a non-failing session`
          );
          continue;
        }
      }
    }
    if (account.authToken) {
      await scraper.setCookies([
        new Cookie({
          domain: "twitter.com",
          key: "auth_token",
          value: account.authToken,
        }),
      ]);
      if (await scraper.isLoggedIn()) {
        continue;
      }
    }
    try {
      await scraper.login(
        account.username,
        account.password,
        account.email,
        account.twoFactorSecret
      );
      await accountsDb.insert(accountsSchema.sessions).values({
        ...account,
        cookiesJson: JSON.stringify(
          (await scraper.getCookies()).map((c) => c.toJSON())
        ),
      });
      console.info(`Logged into @${account.username}`);
    } catch (error) {
      console.error(`Failed logging into @${account.username}:`, error);
    }
  }
}

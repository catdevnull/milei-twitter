import { Scraper } from "@catdevnull/twitter-scraper";
import { Cookie } from "tough-cookie";
import escapeStringRegexp from "escape-string-regexp";
import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";

/**
 * parses an CSV that contains the details of multiple Twitter accounts
 * @param csvish the CSV file to parse
 * @param format the format of each line (ex: "username:password:email:emailPassword:authToken:twoFactorSecret")
 * @returns parsed accounts
 */
export function parseAccountList(csvish: string, format: string) {
  let regexp = escapeStringRegexp(format)
    .replace("username", `(?<username>.*)`)
    .replace("password", `(?<password>.*)`)
    .replace("email", `(?<email>.*)`)
    .replace("emailPassword", `(?<emailPassword>.*)`)
    .replace("authToken", `(?<authToken>.*)`)
    .replace("twoFactorSecret", `(?<twoFactorSecret>.*)`);
  const exp = new RegExp(regexp);
  const accounts = csvish
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
  return accounts;
}
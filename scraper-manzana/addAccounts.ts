import escapeStringRegexp from "escape-string-regexp";

export const defaultAccountListFormat =
  "username:password:email:emailPassword:authToken:twoFactorSecret";

export type AccountInfo = {
  username: string;
  password: string;
  email: string;
  emailPassword: string;
  authToken: string;
  twoFactorSecret: string;
};

/**
 * parses an CSV that contains the details of multiple Twitter accounts
 * @param csvish the CSV file to parse
 * @param format the format of each line (ex: "username:password:email:emailPassword:authToken:twoFactorSecret")
 * @returns parsed accounts
 */
export function parseAccountList(
  csvish: string,
  format: string = defaultAccountListFormat
): AccountInfo[] {
  let regexp = escapeStringRegexp(format)
    .replace("username", `(?<username>.*)`)
    .replace("password", `(?<password>.*)`)
    .replace("email", `(?<email>.*)`)
    .replace("emailPassword", `(?<emailPassword>.*)`)
    .replace("authToken", `(?<authToken>.*)`)
    .replace("twoFactorSecret", `(?<twoFactorSecret>.*)`)
    .replaceAll("ANY", `.*`);
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

import assert from "node:assert/strict";
import test from "node:test";
import { parseAccountList } from "./addAccounts.ts";

test("parses provider accounts with ct0 and auth_token cookies", () => {
  const csrfToken = "a".repeat(160);
  const authToken = "b".repeat(40);
  const [account] = parseAccountList(
    `example:password:user@example.com:JBSWY3DPEHPK3PXP:${csrfToken}:${authToken}\r\n`,
    "username:password:email:twoFactorSecret:csrfToken:authToken",
  );

  assert.deepEqual(account, {
    username: "example",
    password: "password",
    email: "user@example.com",
    emailPassword: undefined,
    twoFactorSecret: "JBSWY3DPEHPK3PXP",
    csrfToken,
    authToken,
  });
});

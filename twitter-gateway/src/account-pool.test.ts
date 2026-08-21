import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { BrowserTwitterSession } from "scraper-manzana/browser-twitter";
import { TwitterApiError } from "scraper-manzana/browser-twitter";
import { AccountPool } from "./account-pool.ts";

const originalAccountsList = process.env.ACCOUNTS_LIST;

afterEach(() => {
  if (originalAccountsList === undefined) delete process.env.ACCOUNTS_LIST;
  else process.env.ACCOUNTS_LIST = originalAccountsList;
});

function accounts(count: number) {
  return Array.from(
    { length: count },
    (_, index) =>
      `account${index}:password:account${index}@example.com:${String(index).repeat(40).slice(0, 40)}:email-password`,
  ).join("\n");
}

type FakeSession = {
  account: string;
  close: () => Promise<void>;
};

function asBrowserSession(session: FakeSession) {
  return session as unknown as BrowserTwitterSession;
}

test("runs multiple accounts concurrently with a per-account bound", async () => {
  process.env.ACCOUNTS_LIST = accounts(4);
  let active = 0;
  let initializing = 0;
  let initializationPeak = 0;
  let peak = 0;
  const perAccount = new Map<string, number>();
  const perAccountPeak = new Map<string, number>();
  const initialized = new Set<string>();
  const pool = new AccountPool(undefined, {
    maxActiveAccounts: 2,
    perAccountConcurrency: 2,
    sessionFactory: async (account) => {
      initializing += 1;
      initializationPeak = Math.max(initializationPeak, initializing);
      await new Promise((resolve) => setTimeout(resolve, 5));
      initializing -= 1;
      initialized.add(account.username);
      return asBrowserSession({
        account: account.username,
        close: async () => {},
      });
    },
  });

  await Promise.all(
    Array.from(
      { length: 12 },
      async () =>
        await pool.run(async (session) => {
          const name = (session as unknown as FakeSession).account;
          active += 1;
          peak = Math.max(peak, active);
          const accountActive = (perAccount.get(name) ?? 0) + 1;
          perAccount.set(name, accountActive);
          perAccountPeak.set(
            name,
            Math.max(perAccountPeak.get(name) ?? 0, accountActive),
          );
          await new Promise((resolve) => setTimeout(resolve, 10));
          perAccount.set(name, accountActive - 1);
          active -= 1;
        }),
    ),
  );

  assert.equal(initialized.size, 2);
  assert.equal(initializationPeak, 1);
  assert.equal(peak, 4);
  assert.deepEqual([...perAccountPeak.values()].sort(), [2, 2]);
});

test("drains a rate-limited account and retries on another account", async () => {
  process.env.ACCOUNTS_LIST = accounts(2);
  const closed: string[] = [];
  const visited: string[] = [];
  const pool = new AccountPool(undefined, {
    maxActiveAccounts: 1,
    perAccountConcurrency: 2,
    sessionFactory: async (account) =>
      asBrowserSession({
        account: account.username,
        close: async () => {
          closed.push(account.username);
        },
      }),
  });

  const result = await pool.run(async (session) => {
    const name = (session as unknown as FakeSession).account;
    visited.push(name);
    if (name === "account0") {
      throw new TwitterApiError(429, "Too Many Requests", "rate limited");
    }
    return name;
  });

  assert.equal(result, "account1");
  assert.deepEqual(visited, ["account0", "account1"]);
  assert.deepEqual(closed, ["account0"]);
});

test("retries account-specific authorization and not-found failures", async () => {
  for (const status of [401, 403, 404]) {
    process.env.ACCOUNTS_LIST = accounts(2);
    const visited: string[] = [];
    const pool = new AccountPool(undefined, {
      maxActiveAccounts: 1,
      sessionFactory: async (account) =>
        asBrowserSession({
          account: account.username,
          close: async () => {},
        }),
    });

    const result = await pool.run(async (session) => {
      const name = (session as unknown as FakeSession).account;
      visited.push(name);
      if (name === "account0") {
        throw new TwitterApiError(status, "account-specific failure", "");
      }
      return name;
    });

    assert.equal(result, "account1");
    assert.deepEqual(visited, ["account0", "account1"]);
  }
});

test("rotates accounts after a transient network failure", async () => {
  process.env.ACCOUNTS_LIST = accounts(2);
  const visited: string[] = [];
  const pool = new AccountPool(undefined, {
    maxActiveAccounts: 1,
    sessionFactory: async (account) =>
      asBrowserSession({
        account: account.username,
        close: async () => {},
      }),
  });

  const result = await pool.run(async (session) => {
    const name = (session as unknown as FakeSession).account;
    visited.push(name);
    if (name === "account0") throw new TypeError("fetch failed");
    return name;
  });

  assert.equal(result, "account1");
  assert.deepEqual(visited, ["account0", "account1"]);
});

test("skips an account whose browser session cannot initialize", async () => {
  process.env.ACCOUNTS_LIST = accounts(2);
  const initialized: string[] = [];
  const pool = new AccountPool(undefined, {
    maxActiveAccounts: 1,
    sessionFactory: async (account) => {
      initialized.push(account.username);
      if (account.username === "account0") {
        throw new Error("navigation timed out");
      }
      return asBrowserSession({
        account: account.username,
        close: async () => {},
      });
    },
  });

  const result = await pool.run(
    async (session) => (session as unknown as FakeSession).account,
  );

  assert.equal(result, "account1");
  assert.deepEqual(initialized, ["account0", "account1"]);
});

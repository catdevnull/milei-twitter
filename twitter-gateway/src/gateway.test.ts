import assert from "node:assert/strict";
import test from "node:test";
import type { BrowserTwitterSession } from "scraper-manzana/browser-twitter";
import {
  ORIGINALS_TIMELINE_OPERATION_NAME,
  TIMELINE_OPERATION_NAME,
  TwitterApiError,
} from "scraper-manzana/browser-twitter";
import { AccountPool } from "./account-pool.ts";
import { TwitterGateway } from "./gateway.ts";

test("uses X's current replies timeline operation", async () => {
  const capturedOperations: string[] = [];
  const capturedVariables: Record<string, unknown>[] = [];
  const session = {
    graphqlTemplate: async (
      _cacheKey: string,
      _pageUrl: string,
      operation: string,
    ) => {
      capturedOperations.push(operation);
      return { url: `https://x.com/${operation}`, variables: {}, headers: {} };
    },
    fetchGraphql: async (
      _template: unknown,
      variables: Record<string, unknown>,
    ) => {
      capturedVariables.push(variables);
      return {};
    },
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  await new TwitterGateway(accounts).tweets("4020276615", true);

  assert.deepEqual(capturedOperations, [
    ORIGINALS_TIMELINE_OPERATION_NAME,
    TIMELINE_OPERATION_NAME,
  ]);
  assert.equal(capturedVariables.length, 2);
  assert.ok(capturedVariables.every((variables) => variables.count === 100));
});

test("uses the engagement user-list operations with portable cursors", async () => {
  const calls: Array<{ operation: string; variables: Record<string, unknown> }> = [];
  const registryCalls: string[] = [];
  const session = {
    graphqlTemplate: async (
      _cacheKey: string,
      _pageUrl: string,
      operation: string,
    ) => ({ url: `https://x.com/${operation}`, variables: {}, headers: {} }),
    graphqlTemplateFromRegistry: async (
      _cacheKey: string,
      _pageUrl: string,
      operation: string,
    ) => {
      registryCalls.push(operation);
      return { url: `https://x.com/${operation}`, variables: {}, headers: {} };
    },
    fetchGraphql: async (
      template: { url: string },
      variables: Record<string, unknown>,
    ) => {
      calls.push({ operation: template.url.split("/").at(-1)!, variables });
      return {};
    },
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;
  const gateway = new TwitterGateway(accounts);

  await gateway.favoriters("123", "likes-cursor");
  await gateway.retweeters("123", "retweets-cursor");

  // Favoriters is no longer fired by X's UI, so it must be built from the
  // bundle registry instead of captured from the page.
  assert.deepEqual(registryCalls, ["Favoriters"]);
  assert.deepEqual(calls, [
    {
      operation: "Favoriters",
      variables: {
        tweetId: "123",
        cursor: "likes-cursor",
        count: 100,
        includePromotedContent: false,
      },
    },
    {
      operation: "Retweeters",
      variables: {
        tweetId: "123",
        cursor: "retweets-cursor",
        count: 100,
        includePromotedContent: false,
      },
    },
  ]);
});

test("rebuilds the transaction solver after a strict search 404", async () => {
  let requests = 0;
  let resets = 0;
  const session = {
    graphqlTemplate: async () => ({ url: "https://x.com", variables: {}, headers: {} }),
    fetchSearchGraphql: async () => {
      requests += 1;
      if (requests === 1) throw new TwitterApiError(404, "Not Found", "");
      return {};
    },
    resetTransactionSolver: async () => {
      resets += 1;
    },
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  await new TwitterGateway(accounts).search("from:example", "Latest");

  assert.equal(requests, 2);
  assert.equal(resets, 1);
});

test("rebuilds the transaction solver after a strict follower 404", async () => {
  let templateOperation: string | undefined;
  let variables: Record<string, unknown> | undefined;
  let requests = 0;
  let resets = 0;
  const session = {
    graphqlTemplate: async (
      _cacheKey: string,
      _pageUrl: string,
      operation: string,
    ) => {
      templateOperation = operation;
      return { url: "https://x.com/Followers", variables: {}, headers: {} };
    },
    fetchGraphql: async (
      _template: unknown,
      overrides: Record<string, unknown>,
    ) => {
      variables = overrides;
      requests += 1;
      if (requests === 1) throw new TwitterApiError(404, "Not Found", "");
      return {};
    },
    resetTransactionSolver: async () => {
      resets += 1;
    },
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  await new TwitterGateway(accounts).followers("4020276615", "next-page");

  assert.equal(templateOperation, "Followers");
  assert.deepEqual(variables, {
    userId: "4020276615",
    cursor: "next-page",
  });
  assert.equal(requests, 2);
  assert.equal(resets, 1);
});

test("rejects a premature empty follower page when more are expected", async () => {
  let requests = 0;
  let resets = 0;
  const session = {
    graphqlTemplate: async () => ({
      url: "https://x.com/Followers",
      variables: {},
      headers: {},
    }),
    fetchGraphql: async () => {
      requests += 1;
      return requests === 1
        ? {}
        : { cursorType: "Bottom", value: "recovered-cursor" };
    },
    resetTransactionSolver: async () => {
      resets += 1;
    },
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  const response = await new TwitterGateway(accounts).followers(
    "4020276615",
    "previous-cursor",
    true,
  );

  assert.equal(response.next_cursor, "recovered-cursor");
  assert.equal(requests, 2);
  assert.equal(resets, 1);
});

test("preserves a follower cursor when the account pool rotates after 429", async () => {
  const previousAccounts = process.env.ACCOUNTS_LIST;
  process.env.ACCOUNTS_LIST = [
    `account0:password:a@example.com:mail:${"a".repeat(40)}`,
    `account1:password:b@example.com:mail:${"b".repeat(40)}`,
  ].join("\n");
  const received: Array<{ account: string; cursor: unknown }> = [];
  try {
    const pool = new AccountPool(undefined, {
      maxActiveAccounts: 2,
      sessionFactory: async (account) =>
        ({
          graphqlTemplate: async () => ({
            url: "https://x.com/Followers",
            variables: {},
            headers: {},
          }),
          fetchGraphql: async (
            _template: unknown,
            variables: Record<string, unknown>,
          ) => {
            received.push({ account: account.username, cursor: variables.cursor });
            if (account.username === "account0") {
              throw new TwitterApiError(429, "Too Many Requests", "");
            }
            return {};
          },
          close: async () => {},
        }) as unknown as BrowserTwitterSession,
    });

    await new TwitterGateway(pool).followers("4020276615", "portable-cursor");

    assert.deepEqual(received, [
      { account: "account0", cursor: "portable-cursor" },
      { account: "account1", cursor: "portable-cursor" },
    ]);
  } finally {
    if (previousAccounts === undefined) delete process.env.ACCOUNTS_LIST;
    else process.env.ACCOUNTS_LIST = previousAccounts;
  }
});

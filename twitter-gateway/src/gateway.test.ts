import assert from "node:assert/strict";
import test from "node:test";
import type { BrowserTwitterSession } from "scraper-manzana/browser-twitter";
import {
  ORIGINALS_TIMELINE_OPERATION_NAME,
  REPOSTS_TIMELINE_OPERATION_NAME,
  TIMELINE_OPERATION_NAME,
  TwitterApiError,
} from "scraper-manzana/browser-twitter";
import { AccountPool } from "./account-pool.ts";
import { TwitterGateway, TwitterTweetNotFoundError } from "./gateway.ts";

test("fetches one tweet by ID through TweetDetail", async () => {
  let capturedPageUrl: string | undefined;
  let capturedOperation: string | undefined;
  let capturedVariables: Record<string, unknown> | undefined;
  const tweet = {
    rest_id: "123",
    core: {
      user_results: {
        result: {
          rest_id: "456",
          legacy: { id_str: "456", name: "Author", screen_name: "author" },
        },
      },
    },
    legacy: {
      id_str: "123",
      user_id_str: "456",
      created_at: "Thu Sep 03 18:47:08 +0000 2026",
      full_text: "the requested tweet",
      entities: {},
    },
  };
  const session = {
    graphqlTemplate: async (
      _cacheKey: string,
      pageUrl: string,
      operation: string,
    ) => {
      capturedPageUrl = pageUrl;
      capturedOperation = operation;
      return { url: "https://x.com/TweetDetail", variables: {}, headers: {} };
    },
    fetchGraphql: async (
      _template: unknown,
      variables: Record<string, unknown>,
    ) => {
      capturedVariables = variables;
      return { tweet_results: { result: tweet } };
    },
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  const response = await new TwitterGateway(accounts).tweet("123");

  assert.equal(capturedPageUrl, "https://x.com/i/status/123");
  assert.equal(capturedOperation, "TweetDetail");
  assert.deepEqual(capturedVariables, { focalTweetId: "123" });
  assert.equal(response.id_str, "123");
  assert.equal(response.full_text, "the requested tweet");
});

test("selects the requested tweet instead of a reply in TweetDetail", async () => {
  const result = (id: string) => ({
    rest_id: id,
    core: {
      user_results: {
        result: {
          rest_id: "456",
          legacy: { id_str: "456", name: "Author", screen_name: "author" },
        },
      },
    },
    legacy: { id_str: id, user_id_str: "456", full_text: id, entities: {} },
  });
  const session = {
    graphqlTemplate: async () => ({
      url: "https://x.com/TweetDetail",
      variables: {},
      headers: {},
    }),
    fetchGraphql: async () => [
      { tweet_results: { result: result("reply") } },
      { tweet_results: { result: result("123") } },
    ],
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  assert.equal((await new TwitterGateway(accounts).tweet("123")).id_str, "123");
});

test("reports a missing tweet", async () => {
  const session = {
    graphqlTemplate: async () => ({
      url: "https://x.com/TweetDetail",
      variables: {},
      headers: {},
    }),
    fetchGraphql: async () => ({}),
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  await assert.rejects(
    new TwitterGateway(accounts).tweet("123"),
    TwitterTweetNotFoundError,
  );
});

test("merges X's current originals, replies, and reposts timelines", async () => {
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
    REPOSTS_TIMELINE_OPERATION_NAME,
    TIMELINE_OPERATION_NAME,
  ]);
  assert.equal(capturedVariables.length, 3);
  assert.ok(capturedVariables.every((variables) => variables.count === 100));
});

test("includes reposts when replies are excluded", async () => {
  const capturedOperations: string[] = [];
  const session = {
    graphqlTemplate: async (
      _cacheKey: string,
      _pageUrl: string,
      operation: string,
    ) => {
      capturedOperations.push(operation);
      return { url: `https://x.com/${operation}`, variables: {}, headers: {} };
    },
    fetchGraphql: async () => ({}),
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  await new TwitterGateway(accounts).tweets("4020276615", false);

  assert.deepEqual(capturedOperations, [
    ORIGINALS_TIMELINE_OPERATION_NAME,
    REPOSTS_TIMELINE_OPERATION_NAME,
  ]);
});

test("keeps a repost wrapper and its repost-event timestamp", async () => {
  const user = (id: string, screenName: string) => ({
    rest_id: id,
    legacy: {
      id_str: id,
      name: screenName,
      screen_name: screenName,
      created_at: "Thu Jan 01 00:00:00 +0000 2015",
      profile_image_url_https: "https://pbs.twimg.com/profile.jpg",
    },
  });
  const original = {
    rest_id: "original-id",
    core: { user_results: { result: user("author-id", "author") } },
    legacy: {
      id_str: "original-id",
      user_id_str: "author-id",
      created_at: "Thu Sep 03 18:47:08 +0000 2026",
      full_text: "original tweet",
      entities: {},
    },
  };
  const repost = {
    rest_id: "repost-id",
    core: { user_results: { result: user("4020276615", "JMilei") } },
    legacy: {
      id_str: "repost-id",
      user_id_str: "4020276615",
      created_at: "Fri Sep 04 12:15:03 +0000 2026",
      full_text: "RT @author: original tweet",
      entities: {},
      retweeted_status_result: { result: original },
    },
  };
  const session = {
    graphqlTemplate: async (
      _cacheKey: string,
      _pageUrl: string,
      operation: string,
    ) => ({ url: `https://x.com/${operation}`, variables: {}, headers: {} }),
    fetchGraphql: async (template: { url: string }) =>
      template.url.endsWith(REPOSTS_TIMELINE_OPERATION_NAME)
        ? { tweet_results: { result: repost } }
        : {},
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  const response = await new TwitterGateway(accounts).tweets(
    "4020276615",
    true,
  );

  assert.equal(response.tweets.length, 1);
  assert.equal(response.tweets[0]?.id_str, "repost-id");
  assert.equal(
    response.tweets[0]?.tweet_created_at,
    "2026-09-04T12:15:03.000Z",
  );
  assert.equal(
    (response.tweets[0]?.retweeted_status as { id_str?: string })?.id_str,
    "original-id",
  );
  assert.equal(
    (
      response.tweets[0]?.retweeted_status as {
        tweet_created_at?: string;
      }
    )?.tweet_created_at,
    "2026-09-03T18:47:08.000Z",
  );
});

test("does not restart exhausted timelines from a combined cursor", async () => {
  let requests = 0;
  const session = {
    graphqlTemplate: async (
      _cacheKey: string,
      _pageUrl: string,
      operation: string,
    ) => ({ url: `https://x.com/${operation}`, variables: {}, headers: {} }),
    fetchGraphql: async () => {
      requests += 1;
      return {};
    },
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;
  const cursor = `combined:${Buffer.from(
    JSON.stringify({ originals: null, replies: null, reposts: null }),
  ).toString("base64url")}`;

  const response = await new TwitterGateway(accounts).tweets(
    "4020276615",
    true,
    cursor,
  );

  assert.equal(requests, 0);
  assert.equal(response.next_cursor, null);
});

test("starts the reposts stream when continuing an old combined cursor", async () => {
  const operations: string[] = [];
  const session = {
    graphqlTemplate: async (
      _cacheKey: string,
      _pageUrl: string,
      operation: string,
    ) => ({ url: `https://x.com/${operation}`, variables: {}, headers: {} }),
    fetchGraphql: async (template: { url: string }) => {
      operations.push(template.url.split("/").at(-1)!);
      return {};
    },
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;
  const oldCursor = `combined:${Buffer.from(
    JSON.stringify({ originals: null, replies: null }),
  ).toString("base64url")}`;

  await new TwitterGateway(accounts).tweets("4020276615", true, oldCursor);

  assert.deepEqual(operations, [REPOSTS_TIMELINE_OPERATION_NAME]);
});

test("uses the engagement user-list operations with portable cursors", async () => {
  const calls: Array<{
    operation: string;
    variables: Record<string, unknown>;
  }> = [];
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
    graphqlTemplate: async () => ({
      url: "https://x.com",
      variables: {},
      headers: {},
    }),
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
            received.push({
              account: account.username,
              cursor: variables.cursor,
            });
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

import assert from "node:assert/strict";
import test from "node:test";
import type { BrowserTwitterSession } from "scraper-manzana/browser-twitter";
import {
  TIMELINE_OPERATION_NAME,
  TwitterApiError,
} from "scraper-manzana/browser-twitter";
import type { AccountPool } from "./account-pool.ts";
import { TwitterGateway } from "./gateway.ts";

test("uses X's current replies timeline operation", async () => {
  let capturedOperation: string | undefined;
  let capturedVariables: Record<string, unknown> | undefined;
  const session = {
    graphqlTemplate: async (
      _cacheKey: string,
      _pageUrl: string,
      operation: string,
    ) => {
      capturedOperation = operation;
      return { url: "https://x.com", variables: {}, headers: {} };
    },
    fetchGraphql: async (
      _template: unknown,
      variables: Record<string, unknown>,
    ) => {
      capturedVariables = variables;
      return {};
    },
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  await new TwitterGateway(accounts).tweets("333469835", true);

  assert.equal(capturedOperation, TIMELINE_OPERATION_NAME);
  assert.equal(capturedVariables?.count, 100);
});

test("recaptures a stale search template after a 404", async () => {
  let captures = 0;
  let invalidations = 0;
  let requests = 0;
  const session = {
    graphqlTemplate: async () => ({
      url: `https://x.com/${++captures}`,
      variables: {},
      headers: {},
    }),
    invalidateGraphqlTemplate: () => {
      invalidations += 1;
    },
    fetchGraphql: async () => {
      requests += 1;
      if (requests === 1) throw new TwitterApiError(404, "Not Found", "");
      return {};
    },
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  await new TwitterGateway(accounts).search("from:example", "Latest", "cursor");

  assert.equal(captures, 2);
  assert.equal(invalidations, 1);
  assert.equal(requests, 2);
});

test("returns the browser-captured first search page", async () => {
  let pageUrl: string | undefined;
  const session = {
    captureGraphqlContinuation: async (url: string) => {
      pageUrl = url;
      return { continuation: {}, json: {} };
    },
    closeGraphqlContinuation: async () => {},
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  await new TwitterGateway(accounts).search("from:example", "Latest");

  assert.match(pageUrl ?? "", /q=from%3Aexample/);
});

test("continues search by scrolling the captured browser page", async () => {
  let continuations = 0;
  const continuation = { operationName: "SearchTimeline" };
  const session = {
    captureGraphqlContinuation: async () => ({
      continuation,
      json: {
        data: {
          search_by_raw_query: {
            search_timeline: {
              timeline: {
                instructions: [{ entries: [{ entryId: "cursor-bottom-1", content: { cursorType: "Bottom", value: "cursor-1" } }] }],
              },
            },
          },
        },
      },
    }),
    continueGraphql: async () => {
      continuations += 1;
      return {};
    },
    closeGraphqlContinuation: async () => {},
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;
  const gateway = new TwitterGateway(accounts);

  const first = await gateway.search("from:example", "Latest");
  await gateway.search(first.next_cursor!, "Latest", first.next_cursor!);

  assert.equal(first.next_cursor, "cursor-1");
  assert.equal(continuations, 1);
});

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
  const session = {
    graphqlTemplate: async (
      _cacheKey: string,
      _pageUrl: string,
      operation: string,
    ) => {
      capturedOperation = operation;
      return { url: "https://x.com", variables: {}, headers: {} };
    },
    fetchGraphql: async () => ({}),
  } as unknown as BrowserTwitterSession;
  const accounts = {
    run: async <T>(callback: (value: BrowserTwitterSession) => Promise<T>) =>
      await callback(session),
  } as AccountPool;

  await new TwitterGateway(accounts).tweets("333469835", true);

  assert.equal(capturedOperation, TIMELINE_OPERATION_NAME);
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

  await new TwitterGateway(accounts).search("from:example", "Latest");

  assert.equal(captures, 2);
  assert.equal(invalidations, 1);
  assert.equal(requests, 2);
});

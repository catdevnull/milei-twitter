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

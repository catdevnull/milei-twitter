import assert from "node:assert/strict";
import test from "node:test";
import type { BrowserTwitterSession } from "scraper-manzana/browser-twitter";
import {
  ORIGINALS_TIMELINE_OPERATION_NAME,
  TIMELINE_OPERATION_NAME,
  TwitterApiError,
} from "scraper-manzana/browser-twitter";
import type { AccountPool } from "./account-pool.ts";
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

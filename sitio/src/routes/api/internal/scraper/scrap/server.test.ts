// Set up test database URL
const TEST_DATABASE_URL = "postgresql://localhost/milei_test";

// Override the DATABASE_URL environment variable for testing
process.env.DATABASE_URL = TEST_DATABASE_URL;

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import type { RequestEvent } from "@sveltejs/kit";
import { nanoid } from "nanoid";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../../../../schema.js";
import { eq, sql } from "drizzle-orm";

// Mock the database connection to use test database
vi.mock("../../../../../lib/db/index.js", () => {
  const { drizzle } = require("drizzle-orm/postgres-js");
  const postgres = require("postgres");
  const schema = require("/home/diablo/milei-twitter/sitio/src/schema.ts");
  const client = postgres("postgresql://localhost/milei_test", { max: 1 });
  return {
    db: drizzle(client, { schema }),
  };
});

// Create test database connection
const client = postgres(TEST_DATABASE_URL, { max: 1 });
const testDb = drizzle(client, { schema });

// Import the endpoints after mocking the database
import { POST } from "./+server.js";
import { GET as lastIdsGET } from "../last-ids/+server.js";

// Mock request/response for testing
function mockRequest(
  body: any,
  headers: Record<string, string> = {},
): RequestEvent {
  return {
    request: {
      json: async () => body,
      headers: {
        get: (name: string) => headers[name] || null,
      },
    },
    url: new URL("http://localhost/api/internal/scraper/scrap"),
    platform: {},
    cookies: {} as any,
    locals: {} as any,
    params: {},
    route: {} as any,
    setHeaders: () => {},
    getClientAddress: () => "127.0.0.1",
    isDataRequest: false,
    isSubRequest: false,
    fetch: global.fetch,
  } as any;
}

// Test data
const validScrapData = {
  uid: nanoid(),
  finishedAt: new Date().toISOString(),
  totalTweetsSeen: 100,
  likedTweets: [
    {
      url: "https://twitter.com/test/status/123",
      firstSeenAt: new Date().toISOString(),
      text: "Test tweet",
    },
  ],
  retweets: [
    {
      posterId: "user123",
      posterHandle: "testuser",
      postId: "tweet123",
      firstSeenAt: new Date().toISOString(),
      retweetAt: new Date().toISOString(),
      postedAt: new Date().toISOString(),
      text: "Test retweet",
    },
  ],
  tweets: [
    {
      id: "tweet456",
      twitterScraperJson: JSON.stringify({
        id: "tweet456",
        text: "Test tweet content",
        user: { id: "user123", username: "testuser" },
      }),
      capturedAt: new Date().toISOString(),
    },
  ],
};

const validToken = "test-token-123";

describe("Scraper API Real Database Tests", () => {
  beforeAll(async () => {
    // Clean up any existing test tokens first
    await testDb
      .delete(schema.scraperTokens)
      .where(eq(schema.scraperTokens.token, validToken));

    // Insert test token (schema is already created by migrations)
    await testDb.insert(schema.scraperTokens).values({
      token: validToken,
    });
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await testDb.delete(schema.tweets);
    await testDb.delete(schema.retweets);
    await testDb.delete(schema.likedTweets);
    await testDb.delete(schema.scraps);
  });

  afterAll(async () => {
    // Clean up test token
    await testDb
      .delete(schema.scraperTokens)
      .where(eq(schema.scraperTokens.token, validToken));

    // Close database connection
    await client.end();
  });

  describe("POST /api/internal/scraper/scrap", () => {
    it("should reject requests without authorization header", async () => {
      const request = mockRequest(validScrapData);

      try {
        await POST(request);
        expect.fail("Expected POST to throw an error");
      } catch (error: any) {
        expect(error.status).toBe(401);
        expect(error.body.message).toContain("no Bearer token");
      }
    });

    it("should reject requests with invalid token", async () => {
      const request = mockRequest(validScrapData, {
        Authorization: "Bearer invalid-token",
      });

      try {
        await POST(request);
        expect.fail("Expected POST to throw an error");
      } catch (error: any) {
        expect(error.status).toBe(401);
        expect(error.body.message).toContain("invalid token");
      }
    });

    it("should reject requests with invalid scrap data", async () => {
      const request = mockRequest(
        { invalidField: "invalid" },
        { Authorization: `Bearer ${validToken}` },
      );

      try {
        await POST(request);
        expect.fail("Expected POST to throw an error");
      } catch (error: any) {
        // Could be 401 if token validation fails or 400 if data validation fails
        expect([400, 401]).toContain(error.status);
      }
    });

    it("should successfully process valid scrap data with PostgreSQL", async () => {
      const request = mockRequest(validScrapData, {
        Authorization: `Bearer ${validToken}`,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("scrapId");
      expect(typeof data.scrapId).toBe("number");

      // Verify data was inserted into PostgreSQL database
      const scraps = await testDb.select().from(schema.scraps);
      expect(scraps.length).toBe(1);
      expect(scraps[0].uid).toBe(validScrapData.uid);

      const likedTweets = await testDb.select().from(schema.likedTweets);
      expect(likedTweets.length).toBe(1);
      expect(likedTweets[0].url).toBe(validScrapData.likedTweets[0].url);

      const retweets = await testDb.select().from(schema.retweets);
      expect(retweets.length).toBe(1);
      expect(retweets[0].posterId).toBe(validScrapData.retweets[0].posterId);

      const tweets = await testDb.select().from(schema.tweets);
      expect(tweets.length).toBe(1);
      expect(tweets[0].id).toBe(validScrapData.tweets[0].id);
    });

    it("should handle PostgreSQL conflict resolution correctly", async () => {
      // First request
      const request1 = mockRequest(validScrapData, {
        Authorization: `Bearer ${validToken}`,
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Second request with same UID should use PostgreSQL onConflictDoNothing
      const request2 = mockRequest(validScrapData, {
        Authorization: `Bearer ${validToken}`,
      });

      const response2 = await POST(request2);
      expect(response2.status).toBe(200);

      // Should still only have one scrap record due to PostgreSQL unique constraint
      const scraps = await testDb.select().from(schema.scraps);
      expect(scraps.length).toBe(1);
    });
  });

  describe("GET /api/internal/scraper/last-ids", () => {
    it("should return last tweet IDs from PostgreSQL", async () => {
      // Insert test tweets into PostgreSQL
      await testDb.insert(schema.tweets).values([
        {
          id: "tweet1",
          twitterScraperJson: { test: "data1" },
          capturedAt: new Date("2023-01-01"),
        },
        {
          id: "tweet2",
          twitterScraperJson: { test: "data2" },
          capturedAt: new Date("2023-01-02"),
        },
      ]);

      const response = await lastIdsGET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      expect(data).toContain("tweet1");
      expect(data).toContain("tweet2");
    });

    it("should handle empty PostgreSQL results", async () => {
      const response = await lastIdsGET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toEqual([]);
    });
  });
});

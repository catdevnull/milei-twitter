import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './+server.js';
import { GET as lastIdsGET } from '../last-ids/+server.js';
import type { RequestEvent } from '@sveltejs/kit';
import { nanoid } from 'nanoid';

// Mock the database module
vi.mock('$lib/db/index.js', () => ({
    db: {
        query: {
            scraperTokens: {
                findFirst: vi.fn()
            },
            tweets: {
                findMany: vi.fn()
            }
        },
        transaction: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
    }
}));

// Import the mocked db
import { db } from '$lib/db/index.js';

// Mock request/response for testing
function mockRequest(body: any, headers: Record<string, string> = {}): RequestEvent {
    return {
        request: {
            json: async () => body,
            headers: {
                get: (name: string) => headers[name] || null,
            },
        },
        url: new URL('http://localhost/api/internal/scraper/scrap'),
        platform: {},
        cookies: {} as any,
        locals: {} as any,
        params: {},
        route: {} as any,
        setHeaders: () => { },
        getClientAddress: () => '127.0.0.1',
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
            url: 'https://twitter.com/test/status/123',
            firstSeenAt: new Date().toISOString(),
            text: 'Test tweet',
        },
    ],
    retweets: [
        {
            posterId: 'user123',
            posterHandle: 'testuser',
            postId: 'tweet123',
            firstSeenAt: new Date().toISOString(),
            retweetAt: new Date().toISOString(),
            postedAt: new Date().toISOString(),
            text: 'Test retweet',
        },
    ],
    tweets: [
        {
            id: 'tweet456',
            twitterScraperJson: JSON.stringify({
                id: 'tweet456',
                text: 'Test tweet content',
                user: { id: 'user123', username: 'testuser' },
            }),
            capturedAt: new Date().toISOString(),
        },
    ],
};

const validToken = 'test-token-123';

describe('Scraper API Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/internal/scraper/scrap', () => {
        it('should reject requests without authorization header', async () => {
            const request = mockRequest(validScrapData);

            try {
                await POST(request);
                expect.fail('Expected POST to throw an error');
            } catch (error: any) {
                expect(error.status).toBe(401);
                expect(error.body.message).toContain('no Bearer token');
            }
        });

        it('should reject requests with invalid token', async () => {
            // Mock database to return no token
            vi.mocked(db.query.scraperTokens.findFirst).mockResolvedValue(undefined);

            const request = mockRequest(validScrapData, {
                Authorization: 'Bearer invalid-token',
            });

            try {
                await POST(request);
                expect.fail('Expected POST to throw an error');
            } catch (error: any) {
                expect(error.status).toBe(401);
                expect(error.body.message).toContain('invalid token');
            }
        });

        it('should reject requests with invalid scrap data', async () => {
            // Mock database to return a valid token
            vi.mocked(db.query.scraperTokens.findFirst).mockResolvedValue({
                id: 1,
                token: validToken
            });

            const request = mockRequest(
                { invalidField: 'invalid' },
                { Authorization: `Bearer ${validToken}` }
            );

            try {
                await POST(request);
                expect.fail('Expected POST to throw an error');
            } catch (error: any) {
                expect(error.status).toBe(400);
            }
        });

        it('should accept valid scrap data with valid token', async () => {
            // Mock database interactions
            vi.mocked(db.query.scraperTokens.findFirst).mockResolvedValue({
                id: 1,
                token: validToken
            });

            // Mock transaction
            const mockTransaction = vi.fn(async (callback) => {
                const mockTx = {
                    insert: vi.fn().mockReturnValue({
                        values: vi.fn().mockReturnValue({
                            returning: vi.fn().mockReturnValue({
                                onConflictDoNothing: vi.fn().mockResolvedValue([{ id: 123 }])
                            }),
                            onConflictDoUpdate: vi.fn().mockResolvedValue([{ id: 123 }])
                        })
                    }),
                    update: vi.fn().mockReturnValue({
                        set: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue({})
                        })
                    }),
                    query: {
                        scraps: {
                            findFirst: vi.fn()
                        }
                    }
                };
                return await callback(mockTx);
            });

            vi.mocked(db.transaction).mockImplementation(mockTransaction);

            const request = mockRequest(validScrapData, {
                Authorization: `Bearer ${validToken}`,
            });

            const response = await POST(request);

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toHaveProperty('scrapId');
            expect(typeof data.scrapId).toBe('number');
        });
    });

    describe('GET /api/internal/scraper/last-ids', () => {
        it('should return last tweet IDs', async () => {
            // Mock database to return some tweet IDs
            vi.mocked(db.query.tweets.findMany).mockResolvedValue([
                { id: 'tweet123', twitterScraperJson: {}, capturedAt: new Date() },
                { id: 'tweet456', twitterScraperJson: {}, capturedAt: new Date() },
                { id: 'tweet789', twitterScraperJson: {}, capturedAt: new Date() }
            ]);

            const response = await lastIdsGET();

            expect(response.status).toBe(200);

            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
            expect(data).toEqual(['tweet123', 'tweet456', 'tweet789']);
        });

        it('should handle empty tweet results', async () => {
            // Mock database to return empty results
            vi.mocked(db.query.tweets.findMany).mockResolvedValue([]);

            const response = await lastIdsGET();

            expect(response.status).toBe(200);

            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
            expect(data).toEqual([]);
        });
    });
});
import type {
  BrowserTwitterSession,
  TwitterGraphqlRequestTemplate,
} from "scraper-manzana/browser-twitter";
import {
  ORIGINALS_TIMELINE_OPERATION_NAME,
  REPOSTS_TIMELINE_OPERATION_NAME,
  TIMELINE_OPERATION_NAME,
  TwitterApiError,
} from "scraper-manzana/browser-twitter";
import { AccountPool } from "./account-pool.ts";
import {
  aboutAccountResponse,
  extractProfileResult,
  socialUser,
  timelineResponse,
  usersResponse,
} from "./twitter-data.ts";

const COMBINED_CURSOR_PREFIX = "combined:";

type CombinedCursor = {
  originals: string | null;
  replies: string | null;
  reposts?: string | null;
};

function decodeCombinedCursor(cursor?: string): CombinedCursor | undefined {
  if (!cursor?.startsWith(COMBINED_CURSOR_PREFIX)) return undefined;
  try {
    return JSON.parse(
      Buffer.from(
        cursor.slice(COMBINED_CURSOR_PREFIX.length),
        "base64url",
      ).toString(),
    ) as CombinedCursor;
  } catch {
    return undefined;
  }
}

function encodeCombinedCursor(cursor: CombinedCursor) {
  if (!cursor.originals && !cursor.replies && !cursor.reposts) return null;
  return `${COMBINED_CURSOR_PREFIX}${Buffer.from(JSON.stringify(cursor)).toString("base64url")}`;
}

function mergeTimelinePages(
  originals: ReturnType<typeof timelineResponse> | null,
  replies: ReturnType<typeof timelineResponse> | null,
  reposts: ReturnType<typeof timelineResponse> | null,
) {
  const seen = new Set<string>();
  const tweets = [
    ...(originals?.tweets ?? []),
    ...(replies?.tweets ?? []),
    ...(reposts?.tweets ?? []),
  ]
    .filter((tweet) => {
      const id = typeof tweet.id_str === "string" ? tweet.id_str : undefined;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort(
      (left, right) =>
        Date.parse(String(right.tweet_created_at ?? "")) -
        Date.parse(String(left.tweet_created_at ?? "")),
    );
  return {
    next_cursor: encodeCombinedCursor({
      originals: originals?.next_cursor ?? null,
      replies: replies?.next_cursor ?? null,
      reposts: reposts?.next_cursor ?? null,
    }),
    tweets,
  };
}

export class TwitterGateway {
  constructor(private readonly accounts = new AccountPool()) {}

  search(query: string, type: "Latest" | "Top", cursor?: string) {
    return this.accounts.run(async (session) => {
      const url = new URL("https://x.com/search");
      url.searchParams.set("q", query);
      url.searchParams.set("src", "typed_query");
      url.searchParams.set("f", type === "Latest" ? "live" : "top");
      const template = await session.graphqlTemplate(
        "SearchTimeline",
        url.toString(),
        "SearchTimeline",
      );
      let lastError: unknown;
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        try {
          return timelineResponse(
            await session.fetchSearchGraphql(template, {
              cursor,
              product: type,
              rawQuery: query,
            }),
          );
        } catch (error) {
          lastError = error;
          if (!(error instanceof TwitterApiError) || error.status !== 404) {
            throw error;
          }
          if (attempt < 4) await session.resetTransactionSolver();
        }
      }
      throw lastError;
    });
  }

  profile(identifier: string) {
    return this.accounts.run(async (session) => {
      const numeric = /^\d+$/.test(identifier);
      let json: unknown;
      if (numeric) {
        const template = await session.graphqlTemplate(
          ORIGINALS_TIMELINE_OPERATION_NAME,
          "https://x.com/JMilei",
          ORIGINALS_TIMELINE_OPERATION_NAME,
        );
        json = await session.fetchGraphql(template, { userId: identifier });
      } else {
        const username = identifier.replace(/^@/, "");
        const template = await session.graphqlTemplate(
          "UserByScreenName",
          `https://x.com/${encodeURIComponent(username)}`,
          "UserByScreenName",
        );
        json = await session.fetchGraphql(template, { screen_name: username });
      }
      const result = extractProfileResult(json);
      if (!result) throw new TwitterUserNotFoundError(identifier);
      return socialUser(result);
    });
  }

  about(username: string) {
    return this.accounts.run(async (session) => {
      const screenName = username.replace(/^@/, "");
      const template = await session.graphqlTemplate(
        "AboutAccountQuery",
        `https://x.com/${encodeURIComponent(screenName)}/about`,
        "AboutAccountQuery",
      );
      const response = aboutAccountResponse(
        await session.fetchGraphql(template, { screenName }),
      );
      if (!response) throw new TwitterUserNotFoundError(screenName);
      return response;
    });
  }

  followers(userId: string, cursor?: string, expectMore = false) {
    return this.userList(userId, "followers", "Followers", cursor, expectMore);
  }

  followings(userId: string, cursor?: string) {
    return this.userList(userId, "following", "Following", cursor);
  }

  favoriters(tweetId: string, cursor?: string) {
    return this.engagementUsers(tweetId, "likes", "Favoriters", cursor);
  }

  retweeters(tweetId: string, cursor?: string) {
    return this.engagementUsers(tweetId, "retweets", "Retweeters", cursor);
  }

  tweets(userId: string, includeReplies: boolean, cursor?: string) {
    return this.accounts.run(async (session) => {
      const originalsTemplate = await session.graphqlTemplate(
        ORIGINALS_TIMELINE_OPERATION_NAME,
        "https://x.com/JMilei",
        ORIGINALS_TIMELINE_OPERATION_NAME,
      );
      const combinedCursor = decodeCombinedCursor(cursor);
      const originalsCursor = combinedCursor
        ? combinedCursor.originals
        : cursor?.startsWith(COMBINED_CURSOR_PREFIX)
          ? undefined
          : cursor;
      const repliesCursor = combinedCursor?.replies;
      const repostsCursor = combinedCursor?.reposts;
      const repostsTemplate = await session.graphqlTemplate(
        REPOSTS_TIMELINE_OPERATION_NAME,
        "https://x.com/JMilei/reposts",
        REPOSTS_TIMELINE_OPERATION_NAME,
      );
      const repliesTemplate = includeReplies
        ? await session.graphqlTemplate(
            TIMELINE_OPERATION_NAME,
            "https://x.com/JMilei/with_replies",
            TIMELINE_OPERATION_NAME,
          )
        : undefined;
      const [originals, replies, reposts] = await Promise.all([
        originalsCursor === null
          ? null
          : session
              .fetchGraphql(originalsTemplate, {
                userId,
                cursor: originalsCursor,
                count: 100,
              })
              .then((json) => timelineResponse(json, userId)),
        !includeReplies || repliesCursor === null
          ? null
          : session
              .fetchGraphql(repliesTemplate!, {
                userId,
                cursor: repliesCursor,
                count: 100,
              })
              .then((json) => timelineResponse(json, userId)),
        repostsCursor === null
          ? null
          : session
              .fetchGraphql(repostsTemplate, {
                userId,
                cursor: repostsCursor,
                count: 100,
              })
              .then((json) => timelineResponse(json, userId)),
      ]);
      return mergeTimelinePages(originals, replies, reposts);
    });
  }

  private userList(
    userId: string,
    route: "followers" | "following",
    operation: "Followers" | "Following",
    cursor?: string,
    expectMore = false,
  ) {
    return this.accounts.run(async (session: BrowserTwitterSession) => {
      const template = await session.graphqlTemplate(
        operation,
        `https://x.com/JMilei/${route}`,
        operation,
      );
      let lastError: unknown;
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        try {
          const response = usersResponse(
            await session.fetchGraphql(template, { userId, cursor }),
          );
          if (
            expectMore &&
            cursor &&
            response.users.length === 0 &&
            !response.next_cursor
          ) {
            throw new TwitterApiError(
              404,
              "Premature Empty Timeline",
              "Expected more follower pages",
            );
          }
          return response;
        } catch (error) {
          lastError = error;
          if (!(error instanceof TwitterApiError) || error.status !== 404) {
            throw error;
          }
          if (attempt < 4) await session.resetTransactionSolver();
        }
      }
      throw lastError;
    });
  }

  private engagementUsers(
    tweetId: string,
    route: "likes" | "retweets",
    operation: "Favoriters" | "Retweeters",
    cursor?: string,
  ) {
    return this.accounts.run(async (session: BrowserTwitterSession) => {
      const template = await this.engagementTemplate(
        session,
        tweetId,
        route,
        operation,
      );
      return usersResponse(
        await session.fetchGraphql(template, {
          tweetId,
          cursor,
          count: 100,
          includePromotedContent: false,
        }),
      );
    });
  }

  private async engagementTemplate(
    session: BrowserTwitterSession,
    tweetId: string,
    route: "likes" | "retweets",
    operation: "Favoriters" | "Retweeters",
  ): Promise<TwitterGraphqlRequestTemplate> {
    const retweetersTemplate = await session.graphqlTemplate(
      "Retweeters",
      `https://x.com/x/status/${tweetId}/retweets`,
      "Retweeters",
    );
    if (operation === "Retweeters") return retweetersTemplate;
    // X removed the "Liked by" screen, so Favoriters can no longer be
    // captured from the UI. The operation still exists server-side: build
    // the request from the bundle registry, cloning the Retweeters shape.
    return await session.graphqlTemplateFromRegistry(
      "Favoriters",
      `https://x.com/x/status/${tweetId}/retweets`,
      "Favoriters",
      {
        variables: retweetersTemplate.variables,
        features: retweetersTemplate.features,
        fieldToggles: retweetersTemplate.fieldToggles,
      },
    );
  }
}

export class TwitterUserNotFoundError extends Error {
  constructor(readonly identifier: string) {
    super(`Twitter user ${identifier} was not found`);
    this.name = "TwitterUserNotFoundError";
  }
}

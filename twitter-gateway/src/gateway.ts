import type { BrowserTwitterSession } from "scraper-manzana/browser-twitter";
import {
  ORIGINALS_TIMELINE_OPERATION_NAME,
  TIMELINE_OPERATION_NAME,
  TwitterApiError,
} from "scraper-manzana/browser-twitter";
import { AccountPool } from "./account-pool.ts";
import {
  extractProfileResult,
  socialUser,
  timelineResponse,
  usersResponse,
} from "./twitter-data.ts";

const COMBINED_CURSOR_PREFIX = "combined:";

type CombinedCursor = {
  originals: string | null;
  replies: string | null;
};

function decodeCombinedCursor(cursor?: string): CombinedCursor | undefined {
  if (!cursor?.startsWith(COMBINED_CURSOR_PREFIX)) return undefined;
  try {
    return JSON.parse(
      Buffer.from(cursor.slice(COMBINED_CURSOR_PREFIX.length), "base64url").toString(),
    ) as CombinedCursor;
  } catch {
    return undefined;
  }
}

function encodeCombinedCursor(cursor: CombinedCursor) {
  if (!cursor.originals && !cursor.replies) return null;
  return `${COMBINED_CURSOR_PREFIX}${Buffer.from(JSON.stringify(cursor)).toString("base64url")}`;
}

function mergeTimelinePages(
  originals: ReturnType<typeof timelineResponse> | null,
  replies: ReturnType<typeof timelineResponse> | null,
) {
  const seen = new Set<string>();
  const tweets = [...(originals?.tweets ?? []), ...(replies?.tweets ?? [])]
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

  followers(userId: string, cursor?: string) {
    return this.userList(userId, "followers", "Followers", cursor);
  }

  followings(userId: string, cursor?: string) {
    return this.userList(userId, "following", "Following", cursor);
  }

  tweets(userId: string, includeReplies: boolean, cursor?: string) {
    return this.accounts.run(async (session) => {
      const originalsTemplate = await session.graphqlTemplate(
        ORIGINALS_TIMELINE_OPERATION_NAME,
        "https://x.com/JMilei",
        ORIGINALS_TIMELINE_OPERATION_NAME,
      );
      if (!includeReplies) {
        return timelineResponse(
          await session.fetchGraphql(originalsTemplate, {
            userId,
            cursor,
            count: 100,
          }),
          userId,
        );
      }

      const combinedCursor = decodeCombinedCursor(cursor);
      const originalsCursor = combinedCursor?.originals;
      const repliesCursor = combinedCursor?.replies;
      const repliesTemplate = await session.graphqlTemplate(
        TIMELINE_OPERATION_NAME,
        "https://x.com/JMilei/with_replies",
        TIMELINE_OPERATION_NAME,
      );
      const [originals, replies] = await Promise.all([
        originalsCursor === null
          ? null
          : session
              .fetchGraphql(originalsTemplate, {
                userId,
                cursor: originalsCursor,
                count: 100,
              })
              .then((json) => timelineResponse(json, userId)),
        repliesCursor === null
          ? null
          : session
              .fetchGraphql(repliesTemplate, {
                userId,
                cursor: repliesCursor,
                count: 100,
              })
              .then((json) => timelineResponse(json, userId)),
      ]);
      return mergeTimelinePages(originals, replies);
    });
  }

  private userList(
    userId: string,
    route: "followers" | "following",
    operation: "Followers" | "Following",
    cursor?: string,
  ) {
    return this.accounts.run(async (session: BrowserTwitterSession) => {
      const template = await session.graphqlTemplate(
        operation,
        `https://x.com/JMilei/${route}`,
        operation,
      );
      const json = await session.fetchGraphql(template, { userId, cursor });
      return usersResponse(json);
    });
  }
}

export class TwitterUserNotFoundError extends Error {
  constructor(readonly identifier: string) {
    super(`Twitter user ${identifier} was not found`);
    this.name = "TwitterUserNotFoundError";
  }
}

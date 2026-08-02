import type { BrowserTwitterSession } from "scraper-manzana/browser-twitter";
import { AccountPool } from "./account-pool.ts";
import {
  extractProfileResult,
  socialUser,
  timelineResponse,
  usersResponse,
} from "./twitter-data.ts";

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
      return timelineResponse(
        await session.fetchGraphql(template, {
          cursor,
          product: type,
          rawQuery: query,
        }),
      );
    });
  }

  profile(identifier: string) {
    return this.accounts.run(async (session) => {
      const numeric = /^\d+$/.test(identifier);
      let json: unknown;
      if (numeric) {
        const template = await session.graphqlTemplate(
          "UserTweets",
          "https://x.com/JMilei",
          "UserTweets",
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
      const suffix = includeReplies ? "with_replies" : "";
      const operation = includeReplies ? "UserTweetsAndReplies" : "UserTweets";
      const pageUrl = `https://x.com/JMilei/${suffix}`.replace(/\/$/, "");
      const template = await session.graphqlTemplate(
        operation,
        pageUrl,
        operation,
      );
      const json = await session.fetchGraphql(template, {
        userId,
        cursor,
      });
      return timelineResponse(json);
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

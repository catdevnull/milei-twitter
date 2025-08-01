// un "scraper" pero en vez de usar un scraper de twitter,
// usamos la api de socialdata para no tener que babysitearlo

import { z } from "zod";
import {
  type SocialDataBaseTweet,
  SocialDataErrorResponse,
  SocialDataGenericResponse,
  SocialDataTweet,
  SocialDataTweetsResponse,
  SocialDataUser,
} from "./schemas.ts";
import type { Tweet } from "@catdevnull/twitter-scraper";
import { db } from "../dbs/scraps/index.ts";
import type { Retweet, Scrap, zTweet } from "api/schema.ts";
import { nanoid } from "nanoid";
import { fetch } from "undici";

function headers() {
  const SOCIALDATA_API_KEY = process.env.SOCIALDATA_API_KEY;
  if (!SOCIALDATA_API_KEY) {
    throw new Error("SOCIALDATA_API_KEY is not set");
  }
  return {
    Authorization: `Bearer ${SOCIALDATA_API_KEY}`,
    Accept: "application/json",
  };
}

async function get(url: string): Promise<unknown> {
  console.debug(`--> ${url}`);
  const response = await fetch(url, { headers: headers() });
  console.debug(`--> ${response.status} ${response.statusText}`);
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const json = (await response.json()) as any;
  if (json.status === "error") {
    throw new Error(json.message);
  }
  return json;
}

export async function getUser(userIdOrHandle: string) {
  const response = await get(
    `${process.env.SOCIALDATA_SELFHOSTED_URL}/twitter/user/${userIdOrHandle}`
  );
  return z.union([SocialDataUser, SocialDataGenericResponse]).parse(response);
}

export async function getTweet(tweetId: string) {
  const response = await get(
    `${process.env.SOCIALDATA_SELFHOSTED_URL}/twitter/tweets/${tweetId}`
  );
  return z.union([SocialDataTweet, SocialDataGenericResponse]).parse(response);
}

export async function getTweetsAndReplies(
  userIdOrHandle: string,
  cursor?: string
) {
  let userId = userIdOrHandle;
  if (!userIdOrHandle.match(/^\d+$/)) {
    const user = await getUser(userIdOrHandle);
    if ("status" in user) return user;
    userId = user.id_str;
  }
  const param = cursor ? `cursor=${cursor}` : "";
  const response = await get(
    `${process.env.SOCIALDATA_SELFHOSTED_URL}/twitter/user/${userId}/tweets-and-replies?${param}`
  );
  const parsed = z
    .union([SocialDataTweetsResponse, SocialDataErrorResponse])
    .safeParse(response);
  if (parsed.success) {
    return parsed.data;
  }
  console.error(response);
  throw parsed.error;
}

export async function* getTweetsAndRepliesIterator(userIdOrHandle: string) {
  let res: SocialDataTweetsResponse | null = null;
  while (true) {
    const _res = await getTweetsAndReplies(userIdOrHandle, res?.next_cursor);
    if ("status" in _res) {
      throw new Error(JSON.stringify(_res));
    }
    res = _res;
    yield res.tweets.map(intoTwitterScraperTweet);
    if (!res.next_cursor) {
      break;
    }
  }
}

export function intoTwitterScraperTweet(
  tweet: SocialDataTweet | SocialDataBaseTweet
): Tweet & { rawFromSocialData: SocialDataTweet | SocialDataBaseTweet } {
  return {
    bookmarkCount: tweet.bookmark_count,
    conversationId: undefined, // not sure what the conversation id is
    hashtags: [], // TODO: parse
    html: undefined, // SocialData API doesn't provide HTML
    id: tweet.id_str,
    inReplyToStatus: undefined, // SocialData API doesn't provide full reply status
    inReplyToStatusId: tweet.in_reply_to_status_id_str || undefined,
    isEdited: false, // TODO: parse
    versions: [], // i think SocialData API doesn't provide version history
    isQuoted: tweet.is_quote_status,
    isPin: false, // SocialData API doesn't provide this information
    isReply: !!tweet.in_reply_to_status_id_str,
    isRetweet: !!("retweeted_status" in tweet ? tweet.retweeted_status : false),
    likes: tweet.favorite_count,
    name: tweet.user.name,
    mentions: tweet.entities.user_mentions.map((mention) => ({
      id: mention.id_str,
      username: mention.screen_name,
      name: mention.name,
    })),
    permanentUrl: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
    photos: [], // Would need to parse entities.media for photos
    place: undefined, // SocialData API doesn't provide place information
    quotedStatus: undefined, // SocialData API doesn't provide quoted status
    quotedStatusId: tweet.quoted_status_id_str || undefined,
    replies: tweet.reply_count,
    retweets: tweet.retweet_count,
    retweetedStatus:
      "retweeted_status" in tweet
        ? (tweet.retweeted_status &&
            intoTwitterScraperTweet(tweet.retweeted_status)) ||
          undefined
        : undefined,
    text: tweet.full_text,
    thread: [], // TODO: check
    timeParsed: new Date(tweet.tweet_created_at),
    timestamp: new Date(tweet.tweet_created_at).getTime() / 1000,
    urls: tweet.entities.urls
      .map((url) => url.expanded_url)
      .filter((url): url is string => typeof url === "string"),
    userId: tweet.user.id_str,
    username: tweet.user.screen_name,
    videos: [], // Would need to parse entities.media for videos
    views: tweet.views_count || undefined,
    sensitiveContent: false, // SocialData API doesn't provide this information
    rawFromSocialData: tweet,
  };
}

export function tweetIntoRetweet(tweet: Tweet): Retweet {
  if (!tweet.retweetedStatus) {
    throw new Error("tweet is not a retweet");
  }
  return {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    text: tweet.retweetedStatus.text!,
    firstSeenAt: new Date(),
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    postedAt: tweet.retweetedStatus.timeParsed!,
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    posterHandle: tweet.retweetedStatus.username!,
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    posterId: tweet.retweetedStatus.userId!,
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    postId: tweet.retweetedStatus.id!,
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    retweetAt: tweet.timeParsed!,
  };
}

export async function scrapNewTweets(lastTweetIds?: string[]): Promise<Scrap> {
  const tweets: Array<z.infer<typeof zTweet>> = [];
  const retweets: Array<Retweet> = [];
  try {
    let finished = false;
    for await (const scrappedTweets of getTweetsAndRepliesIterator("jmilei")) {
      if (finished) break;

      for (const tweet of scrappedTweets) {
        tweets.push({
          // biome-ignore lint/style/noNonNullAssertion: <explanation>
          id: tweet.id!,
          twitterScraperJson: JSON.stringify(tweet),
          capturedAt: new Date(),
        });

        if (tweet.retweetedStatus) {
          retweets.push(tweetIntoRetweet(tweet));
        }

        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        if (lastTweetIds?.includes(tweet.id!)) {
          finished = true;
        }
        if (tweets.length > (lastTweetIds?.length || 199)) {
          finished = true;
        }
      }
    }
  } catch (error) {
    console.error("[error] tweets and retweets", error);
  }
  console.info(`--> ${tweets.length} tweets`);
  return {
    finishedAt: new Date(),
    likedTweets: [],
    retweets,
    tweets,
    totalTweetsSeen: tweets.length,
    uid: nanoid(),
  };
}

export async function cron() {
  while (true) {
    const lastScrap = await db.getLastScrap();
    const scrap = await scrapNewTweets(
      lastScrap?.tweets?.map((t) => t.id) || []
    );
    await db.pushScrap(scrap);
    await new Promise((resolve) => setTimeout(resolve, 30 * 60 * 1000));
  }
}

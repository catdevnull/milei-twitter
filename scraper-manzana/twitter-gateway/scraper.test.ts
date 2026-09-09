import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { scrapNewTweets } from "./scraper.ts";

function tweet(index: number) {
  return {
    tweet_created_at: "2026-08-28T12:00:00.000Z",
    id_str: String(1000 + index),
    text: null,
    full_text: `tweet ${index}`,
    source: null,
    truncated: false,
    in_reply_to_status_id_str: null,
    in_reply_to_user_id_str: null,
    in_reply_to_screen_name: null,
    user: {
      id: 4020276615,
      id_str: "4020276615",
      name: "Javier Milei",
      screen_name: "JMilei",
      location: "",
      url: null,
      description: "",
      protected: false,
      verified: true,
      followers_count: 0,
      friends_count: 0,
      listed_count: 0,
      favourites_count: 0,
      statuses_count: 0,
      created_at: "2009-07-16T00:00:00.000Z",
      profile_banner_url: null,
      profile_image_url_https:
        "https://pbs.twimg.com/profile_images/example.jpg",
      can_dm: false,
    },
    quoted_status_id_str: null,
    is_quote_status: false,
    quoted_status: null,
    retweeted_status: null,
    quote_count: 0,
    reply_count: 0,
    retweet_count: 0,
    favorite_count: 0,
    lang: null,
    entities: {},
    views_count: 0,
    bookmark_count: 0,
  };
}

test("fetches the site cron timeline through the authenticated gateway", async () => {
  let authorization: string | undefined;
  const requestedUrls: string[] = [];
  const server = createServer((request, response) => {
    authorization = request.headers.authorization;
    if (request.url) requestedUrls.push(request.url);
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify({
        next_cursor: null,
        tweets: Array.from({ length: 40 }, (_, index) => tweet(index)),
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  const address = server.address();
  assert(address && typeof address === "object");
  const oldUrl = process.env.TWITTER_GATEWAY_URL;
  const oldKey = process.env.TWITTER_GATEWAY_API_KEY;
  process.env.TWITTER_GATEWAY_URL = `http://127.0.0.1:${address.port}`;
  process.env.TWITTER_GATEWAY_API_KEY = "test-key";
  try {
    const scrap = await scrapNewTweets([]);
    assert.equal(scrap.totalTweetsSeen, 40);
    assert.equal(scrap.tweetSnapshot?.tweets.length, 40);
    assert.deepEqual(requestedUrls, [
      "/twitter/user/4020276615/tweets-and-replies",
      "/twitter/user/4020276615/tweets-and-replies",
    ]);
    assert.equal(authorization, "Bearer test-key");
  } finally {
    if (oldUrl === undefined) delete process.env.TWITTER_GATEWAY_URL;
    else process.env.TWITTER_GATEWAY_URL = oldUrl;
    if (oldKey === undefined) delete process.env.TWITTER_GATEWAY_API_KEY;
    else process.env.TWITTER_GATEWAY_API_KEY = oldKey;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

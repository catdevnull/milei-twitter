import assert from "node:assert/strict";
import test from "node:test";
import {
  extractChallengeCode,
  extractGraphqlQueryId,
  selectProxyLine,
  isGraphqlOperation,
  parseTweetResult,
  replaceGraphqlQueryId,
  TIMELINE_OPERATION_ALIASES,
  TIMELINE_OPERATION_NAME,
  TIMELINE_USER_ID,
} from "./scraper.ts";

test("assigns proxy-list entries deterministically by account index", () => {
  const lines = ["proxy-a:80", "", " proxy-b:81 ", "proxy-c:82"];
  assert.equal(selectProxyLine(lines, 0), "proxy-a:80");
  assert.equal(selectProxyLine(lines, 1), "proxy-b:81");
  assert.equal(selectProxyLine(lines, 3), "proxy-a:80");
});

test("captures X's current replies timeline operation", () => {
  assert.equal(TIMELINE_USER_ID, "4020276615");
  assert.equal(TIMELINE_OPERATION_NAME, "UserRepliesTimeline");
  assert.deepEqual(TIMELINE_OPERATION_ALIASES, [
    "UserRepliesTimeline",
    "UserTweetsAndReplies",
  ]);
});

test("recognizes both replies timeline operation names used by X", () => {
  for (const operation of TIMELINE_OPERATION_ALIASES) {
    assert.equal(
      isGraphqlOperation(
        `https://x.com/i/api/graphql/query-id/${operation}?variables=%7B%7D`,
        TIMELINE_OPERATION_ALIASES,
      ),
      true,
    );
  }
  assert.equal(
    isGraphqlOperation(
      "https://x.com/i/api/graphql/query-id/UserTweets",
      TIMELINE_OPERATION_ALIASES,
    ),
    false,
  );
});

test("refreshes a stale GraphQL query ID from X's bundle", () => {
  assert.equal(
    extractGraphqlQueryId(
      'e.exports={queryId:"fresh-id",operationName:"SearchTimeline",operationType:"query"}',
      "SearchTimeline",
    ),
    "fresh-id",
  );
  const refreshed = replaceGraphqlQueryId(
    {
      url: "https://x.com/i/api/graphql/stale-id/SearchTimeline?variables=%7B%7D",
      variables: {},
      headers: {},
    },
    "fresh-id",
  );
  assert.equal(
    refreshed.url,
    "https://x.com/i/api/graphql/fresh-id/SearchTimeline?variables=%7B%7D",
  );
});

test("extracts an ondemand challenge from the numeric chunk manifest", () => {
  const html = '59924:"ondemand.s",59924:"8561faa"';
  assert.equal(extractChallengeCode(html), "8561faa");
});

test("extracts an ondemand challenge from the direct manifest", () => {
  const html = '{"ondemand.s": "challenge-hash"}';
  assert.equal(extractChallengeCode(html), "challenge-hash");
});

test("returns undefined when the page has no responsive-web challenge", () => {
  assert.equal(
    extractChallengeCode('<script src="entry-client.js">'),
    undefined,
  );
});

test("parses author identity from the current user core shape", () => {
  const tweet = parseTweetResult({
    __typename: "Tweet",
    rest_id: "2082526152363561046",
    core: {
      user_results: {
        result: {
          __typename: "User",
          rest_id: "123",
          core: {
            name: "Javier Milei",
            screen_name: "JMilei",
          },
        },
      },
    },
    legacy: {
      created_at: "Wed Jul 29 17:58:20 +0000 2026",
      entities: {},
      full_text: "A tweet",
      id_str: "2082526152363561046",
      user_id_str: "123",
    },
  });

  assert.equal(tweet?.id, "2082526152363561046");
  assert.equal(tweet?.name, "Javier Milei");
  assert.equal(tweet?.username, "JMilei");
});

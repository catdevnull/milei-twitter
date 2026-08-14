import assert from "node:assert/strict";
import test from "node:test";
import {
  extractChallengeCode,
  parseTweetResult,
  TIMELINE_OPERATION_NAME,
} from "./scraper.ts";

test("captures X's current replies timeline operation", () => {
  assert.equal(TIMELINE_OPERATION_NAME, "UserRepliesTimeline");
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
  assert.equal(extractChallengeCode('<script src="entry-client.js">'), undefined);
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

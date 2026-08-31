import assert from "node:assert/strict";
import test from "node:test";
import {
  findBottomCursor,
  socialTweet,
  timelineResponse,
} from "./twitter-data.ts";

test("selects the bottom cursor when a timeline also has a top cursor", () => {
  assert.equal(
    findBottomCursor({
      instructions: [
        {
          entryType: "TimelineTimelineCursor",
          cursorType: "Top",
          value: "top-cursor",
        },
        {
          entryType: "TimelineTimelineCursor",
          cursorType: "Bottom",
          value: "bottom-cursor",
        },
      ],
    }),
    "bottom-cursor",
  );
});

test("filters non-author entries from a user's timeline", () => {
  const tweet = (id: string, userId: string) => ({
    tweet_results: {
      result: {
        rest_id: id,
        core: {
          user_results: {
            result: {
              rest_id: userId,
              legacy: { id_str: userId, screen_name: `user${userId}` },
            },
          },
        },
        legacy: {
          id_str: id,
          user_id_str: userId,
          full_text: `tweet ${id}`,
          entities: {},
        },
      },
    },
  });
  const response = timelineResponse(
    [tweet("1", "owner"), tweet("2", "other")],
    "owner",
  );

  assert.deepEqual(
    response.tweets.map((item) => item.id_str),
    ["1"],
  );
});

test("drops incomplete quoted tweets without dropping the parent tweet", () => {
  const result = socialTweet({
    rest_id: "parent",
    core: {
      user_results: {
        result: {
          rest_id: "owner",
          core: { name: "Owner", screen_name: "owner" },
          legacy: { id_str: "owner" },
        },
      },
    },
    legacy: {
      id_str: "parent",
      created_at: "Mon Aug 31 16:35:25 +0000 2026",
      full_text: "parent tweet",
      entities: {},
    },
    quoted_status_result: {
      result: {
        rest_id: "partial-quote",
        legacy: { id_str: "partial-quote", full_text: "missing author" },
      },
    },
  });

  assert.ok(result);
  assert.equal(result.quoted_status, null);
});

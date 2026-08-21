import assert from "node:assert/strict";
import test from "node:test";
import { findBottomCursor, timelineResponse } from "./twitter-data.ts";

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

import assert from "node:assert/strict";
import test from "node:test";
import {
  aboutAccountResponse,
  findBottomCursor,
  socialTweet,
  timelineResponse,
} from "./twitter-data.ts";

test("parses About this account metadata", () => {
  assert.deepEqual(
    aboutAccountResponse({
      data: {
        user_result_by_screen_name: {
          result: {
            rest_id: "123",
            core: {
              screen_name: "example",
              created_at: "Wed Dec 06 02:59:51 +0000 2023",
            },
            about_profile: {
              account_based_in: "Argentina",
              location_accurate: true,
              source: "Argentina Android App",
              username_changes: {
                count: "2",
                last_changed_at_msec: "1725330158431",
              },
            },
          },
        },
      },
    }),
    {
      id_str: "123",
      screen_name: "example",
      created_at: "2023-12-06T02:59:51.000Z",
      account_based_in: "Argentina",
      location_accurate: true,
      source: "Argentina Android App",
      username_changes: {
        count: 2,
        last_changed_at_msec: "1725330158431",
      },
      raw_twitter: {
        rest_id: "123",
        core: {
          screen_name: "example",
          created_at: "Wed Dec 06 02:59:51 +0000 2023",
        },
        about_profile: {
          account_based_in: "Argentina",
          location_accurate: true,
          source: "Argentina Android App",
          username_changes: {
            count: "2",
            last_changed_at_msec: "1725330158431",
          },
        },
      },
    },
  );
});

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

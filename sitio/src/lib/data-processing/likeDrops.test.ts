import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { analyzeLikeDrops } from "./likeDrops.ts";

describe("analyzeLikeDrops", () => {
  test("stays green when likes never decrease", () => {
    assert.deepEqual(analyzeLikeDrops([100, 120, 120, 135]), {
      level: "green",
      dropEvents: 0,
      totalLikesLost: 0,
      maxSingleDrop: 0,
      maxSingleDropRate: 0,
    });
  });

  test("marks a small decrease as yellow", () => {
    assert.deepEqual(analyzeLikeDrops([1_000, 1_050, 1_041, 1_060]), {
      level: "yellow",
      dropEvents: 1,
      totalLikesLost: 9,
      maxSingleDrop: 9,
      maxSingleDropRate: 9 / 1_050,
    });
  });

  test("requires both the absolute and proportional thresholds for red", () => {
    assert.equal(analyzeLikeDrops([20_000, 19_850]).level, "yellow");
    assert.equal(analyzeLikeDrops([10_000, 9_850]).level, "red");
  });

  test("accumulates multiple drop events", () => {
    const result = analyzeLikeDrops([1_000, 990, 1_020, 1_000]);
    assert.equal(result.dropEvents, 2);
    assert.equal(result.totalLikesLost, 30);
    assert.equal(result.maxSingleDrop, 20);
  });
});

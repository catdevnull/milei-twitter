import assert from "node:assert/strict";
import test from "node:test";
import { extractChallengeCode } from "./scraper.ts";

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

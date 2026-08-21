#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

const out = arg("--out");
const userId = arg("--user-id");
const inputs = process.argv.slice(process.argv.indexOf("--inputs") + 1);
if (!out || !userId || process.argv.indexOf("--inputs") < 0 || inputs.length === 0) {
  throw new Error("Required: --out FILE --user-id ID --inputs FILE...");
}

const tweets = new Map<string, Record<string, unknown>>();
for (const path of inputs) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/g)) {
    if (!line) continue;
    const tweet = JSON.parse(line) as Record<string, unknown>;
    const user = tweet.user as Record<string, unknown> | undefined;
    if (String(user?.id_str ?? user?.id) !== userId) continue;
    const id = String(tweet.id_str ?? tweet.id ?? "");
    if (id && !tweets.has(id)) tweets.set(id, tweet);
  }
}

const rows = [...tweets.values()].sort((left, right) => {
  const leftTime = Date.parse(String(left.tweet_created_at ?? ""));
  const rightTime = Date.parse(String(right.tweet_created_at ?? ""));
  return rightTime - leftTime;
});
writeFileSync(out, rows.map((tweet) => JSON.stringify(tweet)).join("\n") + "\n");
console.log(`Merged ${rows.length} unique tweets into ${out}`);

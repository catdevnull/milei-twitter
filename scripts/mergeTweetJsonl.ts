#!/usr/bin/env bun

import { createReadStream, createWriteStream } from "node:fs";
import { once } from "node:events";
import { createInterface } from "node:readline";

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

async function main() {
  const tweets = new Map<string, { line: string; time: number }>();
  for (const path of inputs) {
    const lines = createInterface({
      input: createReadStream(path),
      crlfDelay: Infinity,
    });
    for await (const line of lines) {
      if (!line) continue;
      const tweet = JSON.parse(line) as Record<string, unknown>;
      const user = tweet.user as Record<string, unknown> | undefined;
      if (String(user?.id_str ?? user?.id) !== userId) continue;
      const id = String(tweet.id_str ?? tweet.id ?? "");
      if (!id || tweets.has(id)) continue;
      tweets.set(id, {
        line,
        time: Date.parse(String(tweet.tweet_created_at ?? "")),
      });
    }
  }

  const rows = [...tweets.values()].sort((left, right) => right.time - left.time);
  const output = createWriteStream(out, { mode: 0o600 });
  for (const row of rows) {
    if (!output.write(`${row.line}\n`)) await once(output, "drain");
  }
  output.end();
  await once(output, "finish");
  console.log(`Merged ${rows.length} unique tweets into ${out}`);
}

await main();

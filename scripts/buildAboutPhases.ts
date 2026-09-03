#!/usr/bin/env node
// Builds the About-download phase lists from the completed followers JSONL.
// One streaming pass collects id/screen_name/created_at; phases are written
// as plain username lists: retweeters (phase A), first 100k in file order
// (phase B), 100k newest accounts (phase C), the rest (phase D).

import {
  appendFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";

function arg(name: string, fallback?: string) {
  const index = process.argv.findIndex(
    (value) => value === name || value.startsWith(`${name}=`),
  );
  if (index < 0) return fallback;
  const value = process.argv[index];
  return value.includes("=")
    ? value.slice(value.indexOf("=") + 1)
    : process.argv[index + 1];
}

type Entry = { name: string; createdAtMs: number };

async function main() {
  const followersPath = arg(
    "--followers",
    "/var/lib/twitter-gateway/followers/jmilei-followers-100000.jsonl",
  )!;
  const engagementDir = arg(
    "--engagement-dir",
    "/var/lib/twitter-gateway/engagement",
  )!;
  const outDir = arg("--out-dir", "/var/lib/twitter-gateway/about")!;
  const firstCount = Number(arg("--first-count", "100000"));
  const newestCount = Number(arg("--newest-count", "100000"));
  mkdirSync(outDir, { recursive: true });

  const entries: Entry[] = [];
  const lines = createInterface({
    input: createReadStream(followersPath),
    crlfDelay: Infinity,
  });
  let parsed = 0;
  for await (const line of lines) {
    if (!line) continue;
    let user: { id_str?: string; screen_name?: string; created_at?: string };
    try {
      user = JSON.parse(line);
    } catch {
      continue;
    }
    const name = user.screen_name;
    if (!name) continue;
    const ms = user.created_at ? Date.parse(user.created_at) : Number.NaN;
    entries.push({ name, createdAtMs: Number.isNaN(ms) ? 0 : ms });
    parsed += 1;
    if (parsed % 500_000 === 0) console.log(`scanned ${parsed}...`);
  }
  console.log(`followers scanned: ${entries.length}`);

  const phaseB = entries.slice(0, firstCount);
  const phaseBNames = new Set(phaseB.map((entry) => entry.name.toLowerCase()));

  const sortedByNewest = entries
    .map((entry, index) => ({ index, ms: entry.createdAtMs }))
    .sort((a, b) => b.ms - a.ms);
  const phaseC: string[] = [];
  const phaseCNames = new Set<string>();
  for (const { index } of sortedByNewest) {
    if (phaseC.length >= newestCount) break;
    const name = entries[index]!.name;
    const key = name.toLowerCase();
    if (phaseBNames.has(key) || phaseCNames.has(key)) continue;
    phaseCNames.add(key);
    phaseC.push(name);
  }

  const phaseDNames = new Set<string>([...phaseBNames, ...phaseCNames]);
  const phaseDPath = join(outDir, "phase-d-rest.txt");
  const phaseDStream = createWriteStream(phaseDPath, { flags: "w" });
  let phaseDCount = 0;
  for (const entry of entries) {
    if (phaseDNames.has(entry.name.toLowerCase())) continue;
    phaseDStream.write(`${entry.name}\n`);
    phaseDCount += 1;
  }
  await new Promise((resolve, reject) => {
    phaseDStream.end(() => resolve(undefined));
    phaseDStream.on("error", reject);
  });

  const writeList = (path: string, names: string[]) => {
    appendFileSync(path, `${names.join("\n")}\n`);
    console.log(`wrote ${names.length} -> ${path}`);
  };
  writeList(join(outDir, "phase-b-first100k.txt"), phaseB.map((e) => e.name));
  writeList(join(outDir, "phase-c-newest100k.txt"), phaseC);
  console.log(`wrote ${phaseDCount} -> ${phaseDPath}`);

  // Phase A: unique retweeters in file order (if engagement data exists).
  if (existsSync(engagementDir)) {
    const phaseAPath = join(outDir, "phase-a-retweeters.txt");
    const seen = new Set<string>();
    const phaseA: string[] = [];
    for (const file of readdirSync(engagementDir).sort()) {
      if (!file.startsWith("retweeters-") || !file.endsWith(".jsonl")) continue;
      const fileLines = createInterface({
        input: createReadStream(join(engagementDir, file)),
        crlfDelay: Infinity,
      });
      for await (const line of fileLines) {
        if (!line) continue;
        let user: { screen_name?: string; id_str?: string };
        try {
          user = JSON.parse(line);
        } catch {
          continue;
        }
        const name = user.screen_name ?? user.id_str;
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        phaseA.push(name);
      }
    }
    writeList(phaseAPath, phaseA);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node
// Fetches the "About this account" payload for every username in a file,
// concurrently and resumably. Results are appended to one JSONL; usernames
// that no longer resolve are recorded as missing and never retried.

import {
  appendFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

type AboutRecord = {
  id_str?: string;
  screen_name?: string;
  missing?: boolean;
  error?: string;
  [key: string]: unknown;
};

type State = {
  completed: number;
  missing: number;
  failed: number;
  updated_at: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

function saveState(path: string, state: State) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
}

async function readNames(path: string) {
  const names: string[] = [];
  const lines = createInterface({
    input: createReadStream(path),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    const name = line.trim().replace(/^@/, "");
    if (name) names.push(name);
  }
  return names;
}

async function completedKeys(outPath: string, missingPath: string) {
  const done = new Set<string>();
  const add = (record: AboutRecord) => {
    if (record.id_str) done.add(record.id_str);
    if (record.screen_name) done.add(record.screen_name.toLowerCase());
  };
  for (const path of [outPath, missingPath]) {
    if (!existsSync(path)) continue;
    const lines = createInterface({
      input: createReadStream(path),
      crlfDelay: Infinity,
    });
    for await (const line of lines) {
      if (line) add(JSON.parse(line) as AboutRecord);
    }
  }
  return done;
}

async function fetchAbout(
  baseUrl: string,
  apiKey: string,
  username: string,
) {
  const url = `${baseUrl}/twitter/user/${encodeURIComponent(username)}/about`;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(120_000),
    }).catch(() => undefined);
    if (response?.ok) {
      const json = (await response.json()) as AboutRecord;
      delete json.raw_twitter;
      return json;
    }
    if (response && response.status === 404) {
      return { screen_name: username, missing: true } satisfies AboutRecord;
    }
    if (response && response.status < 500 && response.status !== 429) {
      throw new Error(
        `${response.status} ${response.statusText}: ${await response.text()}`,
      );
    }
    const retryAfter = Number(response?.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1_000
      : Math.min(120_000, attempt * 10_000);
    if (attempt < 8) {
      console.warn(
        `${username} status=${response?.status ?? "network"}; retry=${Math.ceil(delay / 1_000)}s attempt=${attempt}/8`,
      );
      await sleep(delay);
    } else {
      throw new Error(`${username} retries exhausted status=${response?.status ?? "network"}`);
    }
  }
  throw new Error("unreachable");
}

function saveRecord(outPath: string, record: AboutRecord) {
  appendFileSync(outPath, `${JSON.stringify(record)}\n`);
}

async function main() {
  const apiKey =
    process.env.TWITTER_GATEWAY_API_KEY ?? process.env.SOCIALAPI_KEY;
  const baseUrl = arg(
    "--base-url",
    process.env.TWITTER_GATEWAY_URL ?? "https://docial.nulo.lol",
  )!;
  const usernamesPath = arg("--usernames-file")!;
  const outPath = arg("--out")!;
  const statePath = arg("--state", `${outPath}.state.json`)!;
  const missingPath = `${outPath}.missing.jsonl`;
  const failedPath = `${outPath}.failed.jsonl`;
  const concurrency = Math.max(1, Number(arg("--concurrency", "8")));

  if (!apiKey) throw new Error("Required: TWITTER_GATEWAY_API_KEY");
  if (!usernamesPath) throw new Error("Required: --usernames-file");
  mkdirSync(dirname(outPath), { recursive: true });

  const usernames = await readNames(usernamesPath);
  const done = await completedKeys(outPath, missingPath);
  const seenPending = new Set<string>();
  const pending: string[] = [];
  for (const name of usernames) {
    const key = name.toLowerCase();
    if (done.has(key) || seenPending.has(key)) continue;
    seenPending.add(key);
    pending.push(name);
  }

  console.log(
    `about usernames=${usernames.length} done=${done.size} pending=${pending.length} concurrency=${concurrency} out=${outPath}`,
  );

  let completed = 0;
  let missing = 0;
  let failed = 0;
  let cursor = 0;
  let lastSave = Date.now();

  const saveProgress = (force = false) => {
    if (!force && Date.now() - lastSave < 30_000) return;
    lastSave = Date.now();
    saveState(statePath, {
      completed,
      missing,
      failed,
      updated_at: new Date().toISOString(),
    });
  };

  const worker = async (workerId: number) => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= pending.length) return;
      const username = pending[index]!;
      try {
        const record = await fetchAbout(baseUrl, apiKey, username);
        if (record.missing) {
          missing += 1;
          appendFileSync(missingPath, `${JSON.stringify(record)}\n`);
        } else {
          completed += 1;
          saveRecord(outPath, record);
        }
      } catch (error) {
        failed += 1;
        appendFileSync(failedPath, `${JSON.stringify({ screen_name: username, error: String(error).slice(0, 300) })}\n`);
        console.error(`worker=${workerId} ${String(error).slice(0, 200)}`);
      }
      if ((completed + missing + failed) % 100 === 0) {
        console.log(
          `progress done=${completed} missing=${missing} failed=${failed} of=${pending.length}`,
        );
        saveProgress();
      } else {
        saveProgress();
      }
    }
  };

  await Promise.all(
    Array.from({ length: concurrency }, (_, index) => worker(index)),
  );

  saveProgress(true);
  console.log(
    `About pass finished. completed=${completed} missing=${missing} failed=${failed} out=${outPath}`,
  );
  if (failed > 0) {
    console.log(`Failed usernames were logged to ${failedPath} for a later retry.`);
  }
}

function missingPath(_failedPath: string, _outPath: string) {
  return `${_outPath}.missing.jsonl`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

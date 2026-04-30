import { defineConfig } from "@trigger.dev/sdk";
import { playwright } from "@trigger.dev/build/extensions/playwright";
import {
  additionalFiles,
  additionalPackages,
  aptGet,
  syncEnvVars,
} from "@trigger.dev/build/extensions/core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const syncedEnvKeys = [
  "API_TOKEN",
  "API_URL",
  "SOCIALDATA_API_KEY",
  "SOCIALDATA_SELFHOSTED_URL",
  "WEBSHARE_PROXY_LIST_URL",
  "PROXY_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "TWITTER_BROWSER_HEADLESS",
  "TWITTER_BROWSER_USER_DATA_DIR",
  "TWITTER_BROWSER_SKIP_AUTH_TOKEN",
  "REBROWSER_PATCHES_RUNTIME_FIX_MODE",
  "REBROWSER_PATCHES_SOURCE_URL",
  "REBROWSER_PATCHES_UTILITY_WORLD_NAME",
];

function accountListFromEnvOrFile() {
  if (process.env.ACCOUNTS_LIST) return process.env.ACCOUNTS_LIST;
  const filePath = process.env.ACCOUNTS_FILE_PATH;
  if (!filePath) return undefined;
  return readFileSync(resolve(process.cwd(), filePath), "utf-8");
}

function envForDeploy() {
  const env: Record<string, string> = {};
  for (const key of syncedEnvKeys) {
    const value = process.env[key];
    if (value) env[key] = value;
  }

  const accountsList = accountListFromEnvOrFile();
  if (accountsList) env.ACCOUNTS_LIST = accountsList;
  env.ACCOUNTS_FILE_FORMAT =
    process.env.ACCOUNTS_FILE_FORMAT ??
    "username:password:email:emailPassword:authToken:ANY";
  env.TWITTER_BROWSER_HEADLESS = process.env.TWITTER_BROWSER_HEADLESS ?? "0";
  env.TWITTER_BROWSER_USER_DATA_DIR =
    process.env.TWITTER_BROWSER_USER_DATA_DIR ??
    "/tmp/milei-twitter-browser-profile";
  env.REBROWSER_PATCHES_RUNTIME_FIX_MODE =
    process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE ?? "alwaysIsolated";
  env.REBROWSER_PATCHES_SOURCE_URL =
    process.env.REBROWSER_PATCHES_SOURCE_URL ?? "app.js";
  env.REBROWSER_PATCHES_UTILITY_WORLD_NAME =
    process.env.REBROWSER_PATCHES_UTILITY_WORLD_NAME ?? "util";

  return env;
}

export default defineConfig({
  project: "proj_atmciwvmssuswvexgkmb",
  runtime: "node",
  logLevel: "log",
  machine: "medium-1x",
  maxDuration: 1000 * 60,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["trigger"],
  build: {
    external: ["better-sqlite3"],
    extensions: [
      syncEnvVars(envForDeploy),
      aptGet({ packages: ["patch"] }),
      playwright({ headless: false }),
      additionalPackages({ packages: ["rebrowser-patches@1.0.19"] }),
      additionalFiles({ files: ["ensure-rebrowser-patches.mjs"] }),
      {
        name: "rebrowser-patches",
        onBuildComplete(context) {
          context.addLayer({
            id: "rebrowser-patches",
            commands: ["node ensure-rebrowser-patches.mjs"],
          });
        },
      },
    ],
  },
});

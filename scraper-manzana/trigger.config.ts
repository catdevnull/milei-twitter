import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_atmciwvmssuswvexgkmb",
  runtime: "node",
  logLevel: "log",
  machine: "micro",
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
  },
});

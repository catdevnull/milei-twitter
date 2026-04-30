import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const playwrightPackage = require.resolve("playwright/package.json");
const patcher = require.resolve("rebrowser-patches/scripts/patcher.js");
const packagePath = resolve(dirname(playwrightPackage), "../playwright-core");

function run(command) {
  return spawnSync(
    process.execPath,
    [patcher, command, "--packagePath", packagePath],
    { stdio: "inherit" },
  );
}

const check = run("check");
if (check.status === 0) process.exit(0);

const patch = run("patch");
process.exit(patch.status ?? 1);

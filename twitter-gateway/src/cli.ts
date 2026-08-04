import { randomBytes } from "node:crypto";
import { appendFile, chmod, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { authFilePath } from "./auth.ts";

const [command, name] = process.argv.slice(2);

if (command !== "create-user" || !name) {
  console.error("Usage: pnpm user:create -- <name>");
  process.exitCode = 1;
} else if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
  console.error("User names may contain letters, numbers, _, ., and - only");
  process.exitCode = 1;
} else {
  const path = resolve(authFilePath());
  const existing = await readFile(path, "utf8").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return "";
    }
    throw error;
  });
  const duplicate = existing
    .split(/\r?\n/)
    .some((line) => line.slice(0, line.indexOf(":")) === name);
  if (duplicate) {
    console.error(`API user ${name} already exists in ${path}`);
    process.exitCode = 1;
  } else {
    const key = randomBytes(32).toString("base64url");
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${name}:${key}\n`, { encoding: "utf8", mode: 0o600 });
    await chmod(path, 0o600);
    console.info(`Created API user ${name}`);
    console.info(`API key: ${key}`);
    console.info(`Saved to: ${path}`);
  }
}

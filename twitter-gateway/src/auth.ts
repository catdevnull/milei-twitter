import { createHash, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { MiddlewareHandler } from "hono";

export const authFilePath = () => process.env.API_AUTH_FILE ?? "api-users.txt";

type ApiUser = { keyHash: Buffer; name: string };

async function apiUsers(): Promise<ApiUser[]> {
  let contents: string;
  try {
    contents = await readFile(authFilePath(), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator < 1 || separator === line.length - 1) return undefined;
      return {
        name: line.slice(0, separator).trim(),
        keyHash: hash(line.slice(separator + 1).trim()),
      };
    })
    .filter((user): user is ApiUser => !!user);
}

function hash(value: string) {
  return createHash("sha256").update(value).digest();
}

export const apiAuth: MiddlewareHandler = async (c, next) => {
  const users = await apiUsers();
  if (users.length === 0) {
    return c.json({ error: "API authentication is not configured" }, 503);
  }
  const authorization = c.req.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  const candidate = hash(match?.[1] ?? "");
  const user = users.find(
    (entry) =>
      entry.keyHash.length === candidate.length &&
      timingSafeEqual(entry.keyHash, candidate),
  );
  if (!user) {
    return c.json({ error: "Invalid or missing API key" }, 401);
  }
  c.header("X-API-User", user.name);
  await next();
};

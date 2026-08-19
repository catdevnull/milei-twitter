import { mkdir, readFile, readlink, unlink, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { nanoid } from "nanoid";
import type { Browser, BrowserContext, Page, Request } from "playwright";
import { Cookie } from "tough-cookie";
import {
  fetch as undiciFetch,
  Headers,
  ProxyAgent,
  type RequestInit,
} from "undici";
import type { Retweet, Scrap } from "api/schema.ts";
import { type AccountInfo, parseAccountList } from "../addAccounts.ts";
import type { TwitterCompatTweet } from "../twitter-compat.ts";

export type TwitterGraphqlRequestTemplate = {
  url: string;
  variables: Record<string, unknown>;
  features?: Record<string, unknown>;
  fieldToggles?: Record<string, unknown>;
  headers: Record<string, string>;
};

export type BrowserTwitterSessionOptions = {
  account?: AccountInfo;
  userDataDir?: string;
  onApiRequest?: (event: TwitterApiRequestEvent) => void | Promise<void>;
};

export type TwitterApiRequestEvent = {
  account?: string;
  durationMs: number;
  error?: string;
  method: "GET";
  operation: string;
  path: string;
  startedAt: Date;
  status?: number;
};

export class TwitterApiError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly body: string,
  ) {
    super(`Twitter API request failed: ${status} ${statusText} ${body}`);
    this.name = "TwitterApiError";
  }
}

type ProxyConfig = {
  server: string;
  username?: string;
  password?: string;
  bypass?: string;
};

type TransactionSolverInitData = {
  challengeData: string;
  vendorData: string;
  anims: string[];
  verificationCode: string;
};

const SOLVER_PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="twitter-site-verification" content="loading" />
</head>
<body><div id="anims"></div></body>
</html>`;

const TIMELINE_URL = "https://x.com/JMilei/with_replies";
export const TIMELINE_OPERATION_NAME = "UserRepliesTimeline";
export const TIMELINE_OPERATION_ALIASES = [
  TIMELINE_OPERATION_NAME,
  "UserTweetsAndReplies",
] as const;

export function isGraphqlOperation(
  requestUrl: string,
  operationNames: readonly string[],
) {
  const url = new URL(requestUrl);
  return (
    url.pathname.includes("/i/api/graphql/") &&
    operationNames.some((operationName) =>
      url.pathname.endsWith(`/${operationName}`),
    )
  );
}

export function extractGraphqlQueryId(
  javascript: string,
  operationName: string,
) {
  const escapedOperation = operationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return javascript.match(
    new RegExp(
      `queryId:\"([^\"]+)\",operationName:\"${escapedOperation}\"`,
    ),
  )?.[1];
}

export function replaceGraphqlQueryId(
  template: TwitterGraphqlRequestTemplate,
  queryId: string,
) {
  const url = new URL(template.url);
  const parts = url.pathname.split("/");
  parts[parts.length - 2] = queryId;
  url.pathname = parts.join("/");
  return { ...template, url: url.toString() };
}

type SharedBrowserState = {
  browser: Browser;
  xvfb?: ChildProcessWithoutNullStreams;
};

let sharedBrowserPromise: Promise<SharedBrowserState> | undefined;
const sharedTemplatePromises = new Map<
  string,
  Promise<TwitterGraphqlRequestTemplate>
>();
let sharedSolverInitPromise: Promise<TransactionSolverInitData> | undefined;
let sharedSolverPagePromise: Promise<Page> | undefined;

async function sharedResource<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>,
) {
  let promise = cache.get(key);
  if (!promise) {
    promise = load();
    cache.set(key, promise);
  }
  try {
    return await promise;
  } catch (error) {
    if (cache.get(key) === promise) cache.delete(key);
    throw error;
  }
}

async function getSharedBrowser(): Promise<SharedBrowserState> {
  if (sharedBrowserPromise) return await sharedBrowserPromise;
  const launch = (async () => {
    process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE ??= "alwaysIsolated";
    process.env.REBROWSER_PATCHES_SOURCE_URL ??= "app.js";
    process.env.REBROWSER_PATCHES_UTILITY_WORLD_NAME ??= "util";
    const { chromium } = await import("playwright");
    const executablePath = process.env.TWITTER_BROWSER_EXECUTABLE_PATH;
    const channel = process.env.TWITTER_BROWSER_CHANNEL;
    const headless = process.env.TWITTER_BROWSER_HEADLESS === "1";
    const xvfb = await startVirtualDisplayIfNeeded(headless);
    try {
      const browser = await chromium.launch({
        channel: executablePath ? undefined : channel,
        executablePath,
        headless,
        args: [
          "--disable-session-crashed-bubble",
          "--no-first-run",
          "--no-default-browser-check",
        ],
      });
      const state = { browser, xvfb };
      browser.on("disconnected", () => {
        if (sharedBrowserPromise === launch) sharedBrowserPromise = undefined;
        sharedSolverInitPromise = undefined;
        sharedSolverPagePromise = undefined;
        xvfb?.kill();
      });
      return state;
    } catch (error) {
      xvfb?.kill();
      throw error;
    }
  })();
  sharedBrowserPromise = launch;
  try {
    return await launch;
  } catch (error) {
    if (sharedBrowserPromise === launch) sharedBrowserPromise = undefined;
    throw error;
  }
}

export async function closeSharedTwitterBrowser() {
  const pending = sharedBrowserPromise;
  sharedBrowserPromise = undefined;
  sharedSolverInitPromise = undefined;
  sharedSolverPagePromise = undefined;
  if (!pending) return;
  const state = await pending.catch(() => undefined);
  if (!state) return;
  try {
    await state.browser.close().catch(() => {});
  } finally {
    state.xvfb?.kill();
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function errnoCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error
    ? String(error.code)
    : undefined;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return errnoCode(error) !== "ESRCH";
  }
}

async function removeStaleChromiumSingletons(userDataDir: string) {
  const singletonLock = join(userDataDir, "SingletonLock");
  let lockOwner: string;
  try {
    lockOwner = await readlink(singletonLock);
  } catch (error) {
    if (errnoCode(error) === "ENOENT") return;
    throw error;
  }

  const ownerMatch = /^(.*)-(\d+)$/.exec(lockOwner);
  const ownerIsAlive =
    ownerMatch?.[1] === hostname() && processIsAlive(Number(ownerMatch[2]));
  if (ownerIsAlive) return;

  console.warn(
    `[twitter-browser] removing stale Chromium profile lock ${lockOwner}`,
  );
  await Promise.all(
    ["SingletonLock", "SingletonSocket", "SingletonCookie"].map(
      async (filename) => {
        try {
          await unlink(join(userDataDir, filename));
        } catch (error) {
          if (errnoCode(error) !== "ENOENT") throw error;
        }
      },
    ),
  );
}

async function getAccountList() {
  if (process.env.ACCOUNTS_LIST) return process.env.ACCOUNTS_LIST;
  const accountsFilePath = process.env.ACCOUNTS_FILE_PATH ?? "accounts.txt";
  return await readFile(accountsFilePath, "utf-8");
}

async function firstAccount(): Promise<AccountInfo> {
  const accounts = parseAccountList(
    await getAccountList(),
    process.env.ACCOUNTS_FILE_FORMAT,
  );
  const account = accounts[0];
  if (!account) throw new Error("ACCOUNTS_LIST did not contain any accounts");
  return account;
}

function normalizeProxyLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) throw new Error("Proxy line is empty");
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  if (trimmed.includes("@")) return `http://${trimmed}`;

  const parts = trimmed.split(":");
  if (parts.length === 4) {
    const [host, port, username, password] = parts;
    return `http://${encodeURIComponent(username)}:${encodeURIComponent(
      password,
    )}@${host}:${port}`;
  }
  if (parts.length === 2) return `http://${trimmed}`;
  throw new Error(`Unsupported proxy format: ${trimmed}`);
}

async function resolveProxyUrl(): Promise<string | undefined> {
  if (process.env.PROXY_URL) return normalizeProxyLine(process.env.PROXY_URL);
  if (!process.env.WEBSHARE_PROXY_LIST_URL) return undefined;

  const response = await undiciFetch(process.env.WEBSHARE_PROXY_LIST_URL);
  if (!response.ok) {
    throw new Error(
      `Could not download proxy list: ${response.status} ${response.statusText}`,
    );
  }
  const firstLine = (await response.text())
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) throw new Error("Downloaded proxy list was empty");
  return normalizeProxyLine(firstLine);
}

function proxyUrlToPlaywright(proxyUrl: string): ProxyConfig {
  const parsed = new URL(proxyUrl);
  return {
    server: parsed.origin,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    bypass: "localhost,127.0.0.1",
  };
}

async function startVirtualDisplayIfNeeded(
  headless: boolean,
): Promise<ChildProcessWithoutNullStreams | undefined> {
  if (headless || process.platform !== "linux" || !process.env.DISPLAY) {
    return undefined;
  }

  const xvfb = spawn(
    "Xvfb",
    [process.env.DISPLAY, "-screen", "0", "1280x900x24", "-nolisten", "tcp"],
    { stdio: "pipe" },
  );

  let stderr = "";
  xvfb.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exit = await new Promise<{
    code: number | null;
    signal: string | null;
  } | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), 500);
    xvfb.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
    xvfb.once("error", () => {
      clearTimeout(timer);
      resolve({ code: 127, signal: null });
    });
  });

  if (exit) {
    const alreadyRunning = /server is already active|already running/i.test(
      stderr,
    );
    if (!alreadyRunning) {
      throw new Error(
        `Could not start Xvfb for headed browser on ${process.env.DISPLAY}: ${stderr.trim() || `exit ${exit.code ?? exit.signal}`}`,
      );
    }
    console.info(
      `[twitter-browser] Xvfb already running on ${process.env.DISPLAY}`,
    );
    return undefined;
  }

  console.info(`[twitter-browser] started Xvfb on ${process.env.DISPLAY}`);
  xvfb.unref();
  return xvfb;
}

function playwrightSameSite(
  sameSite: Cookie["sameSite"],
): "Strict" | "Lax" | "None" | undefined {
  if (!sameSite) return undefined;
  const normalized = String(sameSite).toLowerCase();
  if (normalized === "strict") return "Strict";
  if (normalized === "lax") return "Lax";
  if (normalized === "none") return "None";
  return undefined;
}

function apiFetchUrl(url: URL): URL {
  const next = new URL(url);
  if (next.hostname === "twitter.com" && next.pathname.startsWith("/i/api/")) {
    next.hostname = "x.com";
  } else if (next.hostname === "api.twitter.com") {
    next.hostname = "api.x.com";
  }
  return next;
}

function cookieHeader(cookies: Awaited<ReturnType<BrowserContext["cookies"]>>) {
  const seen = new Set<string>();
  return cookies
    .filter((cookie) => {
      const key = `${cookie.name}:${cookie.domain}:${cookie.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

function getSetCookie(headers: Headers): string[] {
  const maybeGetSetCookie = (
    headers as unknown as {
      getSetCookie?: () => string[];
    }
  ).getSetCookie;
  if (maybeGetSetCookie) return maybeGetSetCookie.call(headers);
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function parseRequestTemplate(request: Request): TwitterGraphqlRequestTemplate {
  const url = new URL(request.url());
  const variables = url.searchParams.get("variables");
  if (!variables) throw new Error("Captured request had no variables param");
  const features = url.searchParams.get("features");
  const fieldToggles = url.searchParams.get("fieldToggles");
  return {
    url: `${url.origin}${url.pathname}`,
    variables: JSON.parse(variables),
    features: features ? JSON.parse(features) : undefined,
    fieldToggles: fieldToggles ? JSON.parse(fieldToggles) : undefined,
    headers: request.headers(),
  };
}

function timelineRequestUrl(
  template: TwitterGraphqlRequestTemplate,
  cursor?: string,
) {
  return graphqlRequestUrl(
    template,
    cursor ? { cursor } : { cursor: undefined },
  );
}

function graphqlRequestUrl(
  template: TwitterGraphqlRequestTemplate,
  variableOverrides: Record<string, unknown> = {},
) {
  const url = apiFetchUrl(new URL(template.url));
  const variables = { ...template.variables, ...variableOverrides };
  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined) delete variables[key];
  }

  const params = new URLSearchParams();
  params.set("variables", JSON.stringify(variables));
  if (template.features)
    params.set("features", JSON.stringify(template.features));
  if (template.fieldToggles) {
    params.set("fieldToggles", JSON.stringify(template.fieldToggles));
  }
  return new URL(`${url}?${params.toString()}`);
}

export function extractChallengeCode(html: string): string | undefined {
  const direct = html.match(/["']ondemand\.s["']\s*:\s*["']([\w-]+)["']/)?.[1];
  if (direct) return direct;

  const chunkId = html.match(/(\d+)\s*:\s*["']ondemand\.s["']/)?.[1];
  if (!chunkId) return undefined;
  return html.match(
    new RegExp(`(?:^|[,{}])\\s*${chunkId}\\s*:\\s*["']([\\w-]+)["']`),
  )?.[1];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function throwIfGraphqlRateLimited(json: unknown) {
  const errors = asArray(asRecord(json)?.errors).map(asRecord);
  const rateLimited = errors.some(
    (error) =>
      error?.code === 88 ||
      /rate limit|too many requests/i.test(asString(error?.message) ?? ""),
  );
  if (rateLimited) {
    throw new TwitterApiError(429, "Too Many Requests", JSON.stringify(errors));
  }
}

function parseViews(result: Record<string, unknown>): number | undefined {
  const views = asRecord(result.views);
  const count = asString(views?.count);
  if (!count) return undefined;
  const parsed = Number(count);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseMedia(media: unknown[]) {
  const photos: TwitterCompatTweet["photos"] = [];
  const videos: TwitterCompatTweet["videos"] = [];
  for (const raw of media) {
    const item = asRecord(raw);
    if (!item) continue;
    const id = asString(item.id_str);
    const type = asString(item.type);
    const imageUrl = asString(item.media_url_https);
    if (!id || !imageUrl) continue;
    if (type === "photo") {
      photos.push({
        id,
        url: imageUrl,
        alt_text: asString(item.ext_alt_text),
      });
    } else if (type === "video" || type === "animated_gif") {
      const variants = asArray(asRecord(item.video_info)?.variants);
      const mp4 = variants
        .map(asRecord)
        .filter((variant): variant is Record<string, unknown> => !!variant)
        .map((variant) => ({
          bitrate: asNumber(variant.bitrate) ?? 0,
          url: asString(variant.url),
        }))
        .filter((variant) => variant.url)
        .sort((a, b) => b.bitrate - a.bitrate)[0];
      videos.push({ id, preview: imageUrl, url: mp4?.url });
    }
  }
  return { photos, videos };
}

function noteTweetText(result: Record<string, unknown>) {
  const noteTweet = asRecord(result.note_tweet);
  const noteResults = asRecord(noteTweet?.note_tweet_results);
  const noteResult = asRecord(noteResults?.result);
  return asString(noteResult?.text);
}

function unwrapTweetResult(
  result: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!result) return undefined;
  const typename = asString(result.__typename);
  if (typename === "TweetWithVisibilityResults") {
    return unwrapTweetResult(asRecord(result.tweet));
  }
  if (!result.legacy && result.tweet)
    return unwrapTweetResult(asRecord(result.tweet));
  if (result.legacy) return result;
  return undefined;
}

export function parseTweetResult(
  input: Record<string, unknown> | undefined,
): TwitterCompatTweet | undefined {
  const result = unwrapTweetResult(input);
  const legacy = asRecord(result?.legacy);
  const core = asRecord(result?.core);
  const userResults = asRecord(asRecord(core?.user_results)?.result);
  const userLegacy = asRecord(userResults?.legacy);
  const userCore = asRecord(userResults?.core);
  if (!result || !legacy || !userResults) return undefined;

  const id = asString(legacy.id_str) ?? asString(result.rest_id);
  const userId = asString(legacy.user_id_str) ?? asString(userResults.rest_id);
  const username =
    asString(userLegacy?.screen_name) ?? asString(userCore?.screen_name);
  const createdAt = asString(legacy.created_at);
  const timeParsed = createdAt ? new Date(createdAt) : undefined;
  const entities = asRecord(legacy.entities);
  const extendedEntities = asRecord(legacy.extended_entities);
  const media = asArray(extendedEntities?.media ?? entities?.media);
  const { photos, videos } = parseMedia(media);
  const retweetedResult = asRecord(
    asRecord(legacy.retweeted_status_result)?.result,
  );
  const quotedResult = asRecord(asRecord(result.quoted_status_result)?.result);
  const retweetedStatus = parseTweetResult(retweetedResult);
  const quotedStatus = parseTweetResult(quotedResult);
  const fullText = noteTweetText(result) ?? asString(legacy.full_text);

  return {
    __raw_UNSTABLE: result,
    bookmarkCount: asNumber(legacy.bookmark_count),
    conversationId: asString(legacy.conversation_id_str),
    hashtags: asArray(asRecord(legacy.entities)?.hashtags)
      .map(asRecord)
      .map((hashtag) => asString(hashtag?.text))
      .filter((hashtag): hashtag is string => !!hashtag),
    id,
    inReplyToStatusId: asString(legacy.in_reply_to_status_id_str),
    isEdited: false,
    versions: id ? [id] : [],
    isQuoted: Boolean(legacy.is_quote_status),
    isPin: false,
    isReply: Boolean(legacy.in_reply_to_status_id_str),
    isRetweet: Boolean(retweetedStatus),
    likes: asNumber(legacy.favorite_count),
    mentions: asArray(entities?.user_mentions)
      .map(asRecord)
      .filter((mention): mention is Record<string, unknown> => !!mention)
      .map((mention) => ({
        id: asString(mention.id_str) ?? "",
        username: asString(mention.screen_name),
        name: asString(mention.name),
      }))
      .filter((mention) => mention.id),
    name: asString(userLegacy?.name) ?? asString(userCore?.name),
    permanentUrl:
      username && id
        ? `https://twitter.com/${username}/status/${id}`
        : undefined,
    photos,
    quotedStatus,
    quotedStatusId: asString(legacy.quoted_status_id_str),
    replies: asNumber(legacy.reply_count),
    retweets: asNumber(legacy.retweet_count),
    retweetedStatus,
    retweetedStatusId: asString(legacy.retweeted_status_id_str),
    text: fullText,
    thread: [],
    timeParsed,
    timestamp: timeParsed ? timeParsed.getTime() / 1000 : undefined,
    urls: asArray(entities?.urls)
      .map(asRecord)
      .map((url) => asString(url?.expanded_url))
      .filter((url): url is string => !!url),
    userId,
    username,
    videos,
    views: parseViews(result),
    sensitiveContent: Boolean(legacy.possibly_sensitive),
  };
}

function collectTimelineEntries(json: unknown) {
  const root = asRecord(json);
  const user = asRecord(asRecord(root?.data)?.user);
  const result = asRecord(user?.result);
  const timeline =
    asRecord(asRecord(asRecord(result?.timeline_v2)?.timeline)) ??
    asRecord(asRecord(result?.timeline)?.timeline);
  const instructions = asArray(timeline?.instructions);
  const tweets: TwitterCompatTweet[] = [];
  let nextCursor: string | undefined;

  function visitEntry(entry: unknown) {
    const entryRecord = asRecord(entry);
    const content = asRecord(entryRecord?.content);
    if (!content) return;
    if (content.cursorType === "Bottom") {
      nextCursor = asString(content.value) ?? nextCursor;
      return;
    }
    const itemContent = asRecord(content.itemContent);
    if (itemContent) {
      const tweet = parseTweetResult(
        asRecord(asRecord(itemContent.tweet_results)?.result) ??
          asRecord(asRecord(itemContent.tweetResult)?.result),
      );
      if (tweet) tweets.push(tweet);
    }
    for (const item of asArray(content.items)) {
      const itemContent = asRecord(asRecord(item)?.item)?.itemContent;
      const itemContentRecord = asRecord(itemContent);
      const tweet = parseTweetResult(
        asRecord(asRecord(itemContentRecord?.tweet_results)?.result) ??
          asRecord(asRecord(itemContentRecord?.tweetResult)?.result),
      );
      if (tweet) tweets.push(tweet);
    }
  }

  for (const instruction of instructions) {
    const instructionRecord = asRecord(instruction);
    visitEntry(instructionRecord?.entry);
    for (const entry of asArray(instructionRecord?.entries)) visitEntry(entry);
  }

  return { tweets, nextCursor };
}

function tweetIntoRetweet(tweet: TwitterCompatTweet): Retweet {
  if (!tweet.retweetedStatus) throw new Error("tweet is not a retweet");
  return {
    text: tweet.retweetedStatus.text!,
    firstSeenAt: new Date(),
    postedAt: tweet.retweetedStatus.timeParsed!,
    posterHandle: tweet.retweetedStatus.username!,
    posterId: tweet.retweetedStatus.userId!,
    postId: tweet.retweetedStatus.id!,
    retweetAt: tweet.timeParsed!,
  };
}

function envNumber(name: string): number | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return parsed;
}

function maxTweetsForScrape(lastTweetIds?: string[]) {
  return envNumber("SCRAPER_MAX_TWEETS") ?? lastTweetIds?.length ?? 199;
}

function oldestTweetDateForScrape() {
  const days = envNumber("SCRAPER_SINCE_DAYS");
  return days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;
}

export class BrowserTwitterSession {
  private readonly context: BrowserContext;
  private page: Page;
  private readonly dispatcher?: ProxyAgent;
  private readonly xvfb?: ChildProcessWithoutNullStreams;
  private ready = false;
  private template?: TwitterGraphqlRequestTemplate;
  private readonly templateCache = new Map<
    string,
    TwitterGraphqlRequestTemplate
  >();
  private readonly account?: AccountInfo;
  private readonly onApiRequest?: BrowserTwitterSessionOptions["onApiRequest"];

  private constructor(
    context: BrowserContext,
    page: Page,
    proxyUrl?: string,
    xvfb?: ChildProcessWithoutNullStreams,
    account?: AccountInfo,
    onApiRequest?: BrowserTwitterSessionOptions["onApiRequest"],
  ) {
    this.context = context;
    this.page = page;
    this.dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
    this.xvfb = xvfb;
    this.account = account;
    this.onApiRequest = onApiRequest;
  }

  static async create(
    options: BrowserTwitterSessionOptions = {},
  ): Promise<BrowserTwitterSession> {
    process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE ??= "alwaysIsolated";
    process.env.REBROWSER_PATCHES_SOURCE_URL ??= "app.js";
    process.env.REBROWSER_PATCHES_UTILITY_WORLD_NAME ??= "util";

    const proxyUrl = await resolveProxyUrl();
    if (!proxyUrl && process.env.TWITTER_ALLOW_DIRECT !== "1") {
      throw new Error(
        "Missing PROXY_URL or WEBSHARE_PROXY_LIST_URL. Set TWITTER_ALLOW_DIRECT=1 to run without a proxy.",
      );
    }
    const userDataDir =
      options.userDataDir ?? process.env.TWITTER_BROWSER_USER_DATA_DIR;
    const executablePath = process.env.TWITTER_BROWSER_EXECUTABLE_PATH;
    const channel = process.env.TWITTER_BROWSER_CHANNEL;
    const headless = process.env.TWITTER_BROWSER_HEADLESS === "1";
    let context: BrowserContext | undefined;
    let xvfb: ChildProcessWithoutNullStreams | undefined;
    try {
      const contextOptions = {
        proxy: proxyUrl ? proxyUrlToPlaywright(proxyUrl) : undefined,
        viewport: { width: 1280, height: 900 },
        locale: "en-US",
        timezoneId: "America/Argentina/Buenos_Aires",
      };
      if (userDataDir) {
        await removeStaleChromiumSingletons(userDataDir);
        xvfb = await startVirtualDisplayIfNeeded(headless);
        const { chromium } = await import("playwright");
        context = await chromium.launchPersistentContext(userDataDir, {
          ...contextOptions,
          channel: executablePath ? undefined : channel,
          executablePath,
          headless,
          args: [
            "--disable-session-crashed-bubble",
            "--no-first-run",
            "--no-default-browser-check",
          ],
        });
      } else {
        const { browser } = await getSharedBrowser();
        context = await browser.newContext(contextOptions);
      }
      const page = context.pages()[0] ?? (await context.newPage());
      page.on("console", (message) => {
        console.info(`[twitter-browser:${message.type()}] ${message.text()}`);
      });
      page.on("pageerror", (error) => {
        console.error(`[twitter-browser:pageerror] ${error.message}`);
      });
      await page.setViewportSize({ width: 1280, height: 900 }).catch(() => {});
      await page
        .evaluate(() => {
          document.title = "milei-twitter automation";
        })
        .catch(() => {});
      await page.bringToFront().catch(() => {});
      const session = new BrowserTwitterSession(
        context,
        page,
        proxyUrl,
        xvfb,
        options.account,
        options.onApiRequest,
      );
      await session.ensureReady();
      return session;
    } catch (error) {
      await context?.close().catch(() => {});
      xvfb?.kill();
      throw error;
    }
  }

  async close() {
    try {
      await this.context.close().catch(() => {});
    } finally {
      this.xvfb?.kill();
    }
  }

  async fetchTimelinePage(cursor?: string) {
    await this.ensureReady();
    if (!this.template) throw new Error("Missing timeline request template");
    const url = timelineRequestUrl(this.template, cursor);
    return await this.fetchApiJson(url, this.template.headers);
  }

  async captureGraphqlRequest(
    pageUrl: string,
    operationName: string,
  ): Promise<TwitterGraphqlRequestTemplate> {
    await this.ensureReady();
    return await this.captureGraphqlTemplate(pageUrl, operationName);
  }

  async graphqlTemplate(
    cacheKey: string,
    pageUrl: string,
    operationName: string,
  ): Promise<TwitterGraphqlRequestTemplate> {
    const cached = this.templateCache.get(cacheKey);
    if (cached) return cached;
    const template = await sharedResource(
      sharedTemplatePromises,
      cacheKey,
      async () => await this.captureGraphqlRequest(pageUrl, operationName),
    );
    this.templateCache.set(cacheKey, template);
    return template;
  }

  async fetchGraphql(
    template: TwitterGraphqlRequestTemplate,
    variableOverrides: Record<string, unknown> = {},
  ) {
    await this.ensureReady();
    const url = graphqlRequestUrl(template, variableOverrides);
    return await this.fetchApiJson(url, template.headers);
  }

  private async fetchApiJson(
    url: URL,
    capturedHeaders: Record<string, string>,
  ) {
    const startedAt = new Date();
    let status: number | undefined;
    let requestError: unknown;
    try {
      const headers = await this.apiHeaders(url, capturedHeaders, "GET");
      const response = await undiciFetch(url, {
        method: "GET",
        headers,
        dispatcher: this.dispatcher,
      });
      status = response.status;
      await this.absorbSetCookie(url, response.headers);
      if (!response.ok) {
        throw new TwitterApiError(
          response.status,
          response.statusText,
          await response.text(),
        );
      }
      const json = await response.json();
      throwIfGraphqlRateLimited(json);
      return json;
    } catch (error) {
      requestError = error;
      if (error instanceof TwitterApiError) status = error.status;
      throw error;
    } finally {
      await this.recordApiRequest(url, startedAt, status, requestError);
    }
  }

  private async captureGraphqlTemplate(
    pageUrl: string,
    operationName: string,
    operationAliases: readonly string[] = [operationName],
  ): Promise<TwitterGraphqlRequestTemplate> {
    const page = await this.ensurePage();
    const startedAt = new Date();
    let response: Awaited<ReturnType<Page["waitForResponse"]>> | undefined;
    let requestError: unknown;
    try {
      [response] = await Promise.all([
        page.waitForResponse(
          (response) => isGraphqlOperation(response.url(), operationAliases),
          { timeout: Number(process.env.TWITTER_CAPTURE_TIMEOUT_MS ?? 60_000) },
        ),
        page.goto(pageUrl, { waitUntil: "domcontentloaded" }),
      ]);
      const template = parseRequestTemplate(response.request());
      if (response.ok()) return template;
      const queryId = await this.currentGraphqlQueryId(pageUrl, operationName);
      return replaceGraphqlQueryId(template, queryId);
    } catch (error) {
      requestError = error;
      throw error;
    } finally {
      if (response) {
        await this.recordApiRequest(
          new URL(response.url()),
          startedAt,
          response.status(),
          requestError,
        );
      }
      if (this.ready) await page.close().catch(() => {});
    }
  }

  private async currentGraphqlQueryId(
    pageUrl: string,
    operationName: string,
  ) {
    const htmlUrl = new URL(pageUrl);
    const headers = await this.apiHeaders(htmlUrl, {}, "GET", {
      transactionId: false,
    });
    const htmlResponse = await undiciFetch(htmlUrl, {
      headers,
      dispatcher: this.dispatcher,
    });
    if (!htmlResponse.ok) {
      throw new TwitterApiError(
        htmlResponse.status,
        htmlResponse.statusText,
        await htmlResponse.text(),
      );
    }
    const html = await htmlResponse.text();
    const mainScript = html.match(
      /https:\/\/abs\.twimg\.com\/responsive-web\/client-web\/main\.[\w-]+\.js/,
    )?.[0];
    if (!mainScript) throw new Error("Could not find X main JavaScript bundle");
    const scriptResponse = await undiciFetch(mainScript, {
      dispatcher: this.dispatcher,
    });
    if (!scriptResponse.ok) {
      throw new Error(
        `Could not fetch X main JavaScript bundle: ${scriptResponse.status} ${scriptResponse.statusText}`,
      );
    }
    const queryId = extractGraphqlQueryId(
      await scriptResponse.text(),
      operationName,
    );
    if (!queryId) {
      throw new Error(`Could not find X query ID for ${operationName}`);
    }
    return queryId;
  }

  private async ensurePage() {
    if (this.page.isClosed()) {
      this.page = await this.context.newPage();
    }
    return this.page;
  }

  private async recordApiRequest(
    url: URL,
    startedAt: Date,
    status?: number,
    requestError?: unknown,
  ) {
    if (!this.onApiRequest) return;
    const operation =
      url.pathname.split("/").filter(Boolean).at(-1) ?? "unknown";
    try {
      await this.onApiRequest({
        account: this.account?.username,
        durationMs: Date.now() - startedAt.getTime(),
        error:
          requestError instanceof Error
            ? requestError.message.slice(0, 1_000)
            : requestError
              ? String(requestError).slice(0, 1_000)
              : undefined,
        method: "GET",
        operation,
        path: url.pathname,
        startedAt,
        status,
      });
    } catch (error) {
      console.error("[twitter-browser] could not record API request", error);
    }
  }

  private async ensureReady() {
    if (this.ready) return;
    await this.ensureLoggedIn();
    this.template = await sharedResource(
      sharedTemplatePromises,
      TIMELINE_OPERATION_NAME,
      async () => await this.captureTimelineRequest(),
    );
    this.templateCache.set(TIMELINE_OPERATION_NAME, this.template);
    await this.installTransactionSolver();
    this.ready = true;
  }

  private async ensureLoggedIn() {
    await this.page.goto("https://x.com/home", {
      waitUntil: "domcontentloaded",
    });
    if (await this.hasAuthCookies()) return;

    const account = this.account ?? (await firstAccount());
    try {
      if (
        account.authToken &&
        process.env.TWITTER_BROWSER_SKIP_AUTH_TOKEN !== "1"
      ) {
        await this.context.addCookies([
          {
            name: "auth_token",
            value: account.authToken,
            domain: ".x.com",
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "None",
          },
          {
            name: "auth_token",
            value: account.authToken,
            domain: ".twitter.com",
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "None",
          },
        ]);
        await this.page.goto("https://x.com/home", {
          waitUntil: "domcontentloaded",
        });
        await this.waitForAuthCookies(5_000);
        if (await this.isLoggedInHome()) return;
      }

      await this.page.goto("https://x.com/i/flow/login", {
        waitUntil: "domcontentloaded",
      });
      await this.runLoginFlow(account);
    } catch (error) {
      await this.dumpDebug("login-failure");
      throw error;
    }
  }

  private async hasAuthCookies() {
    const cookies = await this.context.cookies([
      "https://x.com",
      "https://twitter.com",
    ]);
    return (
      cookies.some((cookie) => cookie.name === "auth_token") &&
      cookies.some((cookie) => cookie.name === "ct0")
    );
  }

  private async waitForAuthCookies(timeout: number) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await this.hasAuthCookies()) return true;
      await this.page.waitForTimeout(100);
    }
    return false;
  }

  private async isLoggedInHome() {
    if (!(await this.hasAuthCookies())) return false;
    const text = await this.page
      .locator("body")
      .innerText()
      .catch(() => "");
    return !/Sign in to X|Log in|Suspicious login prevented/i.test(text);
  }

  private async fillIfVisible(selector: string, value: string) {
    const locator = this.page.locator(selector).first();
    await locator.waitFor({ state: "visible", timeout: 20_000 });
    await locator.fill(value);
  }

  private async clickButton(name: RegExp, timeout = 20_000) {
    await this.page.getByRole("button", { name }).first().click({ timeout });
  }

  private async runLoginFlow(account: AccountInfo) {
    const deadline =
      Date.now() + Number(process.env.TWITTER_LOGIN_TIMEOUT_MS ?? 180_000);
    let submittedPrimaryIdentifier = false;
    let lastLoggedState = "";
    while (Date.now() < deadline) {
      if (await this.hasAuthCookies()) return;

      const password = this.page
        .locator(
          'input[name="password"], input[autocomplete="current-password"]',
        )
        .first();
      if (await password.isVisible().catch(() => false)) {
        await password.fill(account.password);
        await this.pressEnterAndClick(/^(Log in|Iniciar sesión)$/i);
        await this.page.waitForTimeout(2_000);
        continue;
      }

      const textInput = this.page.locator('input[name="text"]').first();
      if (await textInput.isVisible().catch(() => false)) {
        const bodyText = await this.page.locator("body").innerText();
        const placeholder =
          (await textInput.getAttribute("placeholder").catch(() => "")) ?? "";
        const state = JSON.stringify({
          kind: "text",
          submittedPrimaryIdentifier,
          placeholder,
          visibleText: this.summarizeLoginText(bodyText),
        });
        if (state !== lastLoggedState) {
          console.info(`[twitter-login] ${state}`);
          lastLoggedState = state;
        }
        const value = submittedPrimaryIdentifier
          ? this.loginChallengeTextValue(account, bodyText, placeholder)
          : account.username;
        await textInput.fill(value);
        submittedPrimaryIdentifier = true;
        await this.clickButton(/^(Next|Siguiente)$/i);
        await this.page.waitForTimeout(2_000);
        continue;
      }

      const challengeInput = this.page
        .locator('input[data-testid="ocfEnterTextTextInput"]')
        .first();
      if (await challengeInput.isVisible().catch(() => false)) {
        const bodyText = await this.page.locator("body").innerText();
        const state = JSON.stringify({
          kind: "challenge",
          visibleText: this.summarizeLoginText(bodyText),
        });
        if (state !== lastLoggedState) {
          console.info(`[twitter-login] ${state}`);
          lastLoggedState = state;
        }
        await challengeInput.fill(
          this.loginChallengeTextValue(account, bodyText, ""),
        );
        await this.clickButton(/^(Next|Siguiente)$/i);
        await this.page.waitForTimeout(2_000);
        continue;
      }

      await this.page.waitForTimeout(1_000);
    }

    throw new Error("Timed out waiting for Twitter login to complete");
  }

  private summarizeLoginText(text: string) {
    return text
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.includes("@"))
      .slice(0, 12)
      .join(" | ");
  }

  private loginChallengeTextValue(
    account: AccountInfo,
    bodyText: string,
    placeholder: string,
  ) {
    const text = `${bodyText}\n${placeholder}`;
    if (/phone|tel[eé]fono/i.test(text) && !/email|correo/i.test(text)) {
      return account.username;
    }
    if (/email|correo/i.test(text)) {
      return account.email;
    }
    return account.username;
  }

  private async pressEnterAndClick(buttonName: RegExp) {
    await this.page.keyboard.press("Enter").catch(() => {});
    await this.page.waitForTimeout(500);
    await this.page
      .getByRole("button", { name: buttonName })
      .first()
      .click({ timeout: 5_000 })
      .catch(() => {});
  }

  private async dumpDebug(label: string) {
    const dir = process.env.TWITTER_DEBUG_DIR ?? ".twitter-debug";
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = join(dir, `${stamp}-${label}`);
    await this.page
      .screenshot({ path: `${base}.png`, fullPage: true, timeout: 5_000 })
      .catch((error) => {
        console.error(
          `[twitter-browser] could not save debug screenshot`,
          error,
        );
      });
    const text = await this.page
      .locator("body")
      .innerText()
      .catch(() => "");
    await writeFile(`${base}.txt`, text);
    console.error(`Saved Twitter browser debug artifacts to ${base}.png/.txt`);
  }

  private async captureTimelineRequest(): Promise<TwitterGraphqlRequestTemplate> {
    return await this.captureGraphqlTemplate(
      TIMELINE_URL,
      TIMELINE_OPERATION_NAME,
      TIMELINE_OPERATION_ALIASES,
    );
  }

  private async apiHeaders(
    url: URL,
    capturedHeaders: Record<string, string>,
    method: string,
    options: { transactionId?: boolean } = {},
  ) {
    const headers = new Headers();
    for (const [name, value] of Object.entries(capturedHeaders)) {
      if (
        [
          "authorization",
          "user-agent",
          "accept",
          "accept-language",
          "x-twitter-active-user",
          "x-twitter-auth-type",
          "x-twitter-client-language",
        ].includes(name.toLowerCase())
      ) {
        headers.set(name, value);
      }
    }
    const cookies = await this.context.cookies([
      url.origin,
      "https://x.com",
      "https://twitter.com",
      "https://api.x.com",
      "https://api.twitter.com",
    ]);
    const cookie = cookieHeader(cookies);
    const csrf = cookies.find((entry) => entry.name === "ct0")?.value;
    if (cookie) headers.set("cookie", cookie);
    if (csrf) headers.set("x-csrf-token", csrf);
    if (options.transactionId !== false) {
      headers.set(
        "x-client-transaction-id",
        await this.transactionId(method, url),
      );
    }
    return headers;
  }

  private async installTransactionSolver() {
    if (!sharedSolverInitPromise) {
      const initialization = (async () => {
        await this.page
          .waitForLoadState("networkidle", { timeout: 15_000 })
          .catch(() => {});
        await this.page.waitForTimeout(2_000);
        return await this.getSolverInitData();
      })();
      const shared = initialization.catch((error) => {
        if (sharedSolverInitPromise === shared) {
          sharedSolverInitPromise = undefined;
        }
        throw error;
      });
      sharedSolverInitPromise = shared;
    }
    const initData = await sharedSolverInitPromise;
    if (sharedSolverPagePromise) {
      await sharedSolverPagePromise;
      return;
    }
    const setup = (async () => {
      const { browser } = await getSharedBrowser();
      const solverContext = await browser.newContext();
      const solverPage = await solverContext.newPage();
      solverPage.on("console", (message) => {
        console.info(`[twitter-solver:${message.type()}] ${message.text()}`);
      });
      solverPage.on("pageerror", (error) => {
        console.error(`[twitter-solver:pageerror] ${error.message}`);
      });
      const solverUrl = `http://127.0.0.1/milei-twitter-solver-${nanoid()}.html`;
      await solverContext.route(solverUrl, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: SOLVER_PAGE_HTML,
        });
      });
      await solverPage.goto(solverUrl, { waitUntil: "domcontentloaded" });
      await solverPage.evaluate((data) => {
        const browserWindow = window as unknown as {
          __SCRIPTS_LOADED__?: Record<string, boolean>;
          __name?: <T>(value: T) => T;
          webpackChunk_twitter_responsive_web?: Array<Record<number, unknown>>;
          _CHALLENGE?: () => () => (
            path: string,
            method: string,
          ) => Promise<string>;
          __mileiTwitterSolveTransaction?: (
            path: string,
            method: string,
          ) => Promise<string>;
        };
        browserWindow.__SCRIPTS_LOADED__ = { runtime: true };
        browserWindow.__name = (value) => value;
        eval(data.vendorData);

        const animsDiv = document.getElementById("anims");
        if (!animsDiv) throw new Error("Missing animation container");
        for (const anim of data.anims) animsDiv.innerHTML += `\n${anim}`;

        const verification = document.querySelector(
          'meta[name="twitter-site-verification"]',
        );
        if (verification) {
          verification.setAttribute("content", data.verificationCode);
        }

        const idMatch = data.challengeData.match(
          /\.push\(\[\[\d+\],\{(\d+)[:(]/,
        );
        if (!idMatch) throw new Error("Module ID not found");
        const id = idMatch[1];

        const defaultMatch = data.challengeData.match(
          /default:\(\)=>(\w+)\}\)/,
        );
        if (!defaultMatch) throw new Error("Default export not found");
        const defaultVar = defaultMatch[1];
        const patchedChallengeData = data.challengeData.replace(
          `default:()=>${defaultVar}`,
          `default:(window._CHALLENGE=()=>${defaultVar})`,
        );
        eval(patchedChallengeData);

        const chunks = browserWindow.webpackChunk_twitter_responsive_web || [];
        const registry: Record<string, Function> = {};
        for (const payload of chunks) {
          if (payload && payload[1]) Object.assign(registry, payload[1]);
        }

        const cache: Record<string, { exports: Record<string, unknown> }> = {};
        function wreq(moduleId: string) {
          if (cache[moduleId]) return cache[moduleId].exports;
          const factory = registry[moduleId];
          if (!factory) throw new Error(`No module with id ${moduleId}`);
          const module = { id: moduleId, loaded: false, exports: {} };
          cache[moduleId] = module;
          factory(module, module.exports, wreq);
          module.loaded = true;
          return module.exports;
        }

        wreq.d = (
          exports: Record<string, unknown>,
          definition: Record<string, () => unknown>,
        ) => {
          for (const key in definition) {
            Object.defineProperty(exports, key, {
              enumerable: true,
              get: definition[key],
            });
          }
        };
        wreq.r = (exports: Record<string, unknown>) => {
          if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
            Object.defineProperty(exports, Symbol.toStringTag, {
              value: "Module",
            });
          }
          Object.defineProperty(exports, "__esModule", { value: true });
        };
        wreq.n = (mod: { __esModule?: boolean; default?: unknown }) => {
          const getter = mod && mod.__esModule ? () => mod.default : () => mod;
          wreq.d(getter as unknown as Record<string, unknown>, { a: getter });
          return getter;
        };
        wreq.o = (obj: object, prop: string) =>
          Object.prototype.hasOwnProperty.call(obj, prop);

        const chunk = browserWindow
          .webpackChunk_twitter_responsive_web?.[1]?.[1] as
          | Record<string, Function>
          | undefined;
        if (!chunk || !chunk[id])
          throw new Error(`No chunk module with id ${id}`);
        chunk[id](chunks, cache, wreq);
        const challenge = browserWindow._CHALLENGE?.();
        if (!challenge) throw new Error("Challenge export was not initialized");
        browserWindow.__mileiTwitterSolveTransaction = challenge();
      }, initData);
      return solverPage;
    })();
    const shared = setup.catch((error) => {
      if (sharedSolverPagePromise === shared)
        sharedSolverPagePromise = undefined;
      throw error;
    });
    sharedSolverPagePromise = shared;
    await shared;
  }

  private async getSolverInitData(): Promise<TransactionSolverInitData> {
    // X's root URL can be served by the newer x-web app, which does not expose
    // the responsive-web ondemand.s manifest used by the transaction solver.
    // The timeline route uses the same frontend as the request we captured.
    const homeUrl = new URL(TIMELINE_URL);
    const headers = await this.apiHeaders(homeUrl, {}, "GET", {
      transactionId: false,
    });
    headers.set(
      "accept",
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    );
    const homepageResponse = await undiciFetch(homeUrl, {
      headers,
      dispatcher: this.dispatcher,
    });
    await this.absorbSetCookie(homeUrl, homepageResponse.headers);
    if (!homepageResponse.ok) {
      throw new Error(
        `Could not fetch X timeline for transaction solver: ${homepageResponse.status} ${homepageResponse.statusText}`,
      );
    }
    const homepageData = await homepageResponse.text();
    const vendorCode = homepageData.match(/vendor\.([\w-]+)\.js["']/)?.[1];
    const challengeCode = extractChallengeCode(homepageData);
    if (!challengeCode) throw new Error("Could not find X challenge code");

    const challengeUrl = new URL(
      `https://abs.twimg.com/responsive-web/client-web/ondemand.s.${challengeCode}a.js`,
    );
    const challengeResponse = await undiciFetch(challengeUrl, {
      dispatcher: this.dispatcher,
    });
    if (!challengeResponse.ok) {
      throw new Error(
        `Could not fetch X challenge script: ${challengeResponse.status} ${challengeResponse.statusText}`,
      );
    }

    let vendorData = "";
    if (vendorCode) {
      const vendorUrl = new URL(
        `https://abs.twimg.com/responsive-web/client-web/vendor.${vendorCode}.js`,
      );
      const vendorResponse = await undiciFetch(vendorUrl, {
        dispatcher: this.dispatcher,
      });
      if (!vendorResponse.ok) {
        throw new Error(
          `Could not fetch X vendor script: ${vendorResponse.status} ${vendorResponse.statusText}`,
        );
      }
      vendorData = await vendorResponse.text();
    }

    return {
      challengeData: await challengeResponse.text(),
      vendorData,
      anims: homepageData.match(/<svg[^>]+id="loading-x[\s\S]*?<\/svg>/g) ?? [],
      verificationCode:
        homepageData.match(
          /<meta[^>]+name=["']twitter-site-verification["'][^>]+content=["']([^"']+)["']/i,
        )?.[1] ?? "",
    };
  }

  private async transactionId(method: string, url: URL): Promise<string> {
    const solverPage = await sharedSolverPagePromise;
    if (!solverPage) throw new Error("Transaction solver is not installed");
    return await solverPage.evaluate(
      async ({ path, method }) => {
        const solve = (
          window as unknown as {
            __mileiTwitterSolveTransaction?: (
              path: string,
              method: string,
            ) => Promise<string>;
          }
        ).__mileiTwitterSolveTransaction;
        if (!solve) throw new Error("Transaction solver is not installed");
        return await solve(path, method);
      },
      { path: url.pathname, method },
    );
  }

  private async absorbSetCookie(url: URL, headers: Headers) {
    const cookies = getSetCookie(headers)
      .map((header) => Cookie.parse(header))
      .filter((cookie): cookie is Cookie => !!cookie)
      .map((cookie) => ({
        name: cookie.key,
        value: cookie.value,
        domain: cookie.domain ?? url.hostname,
        path: cookie.path ?? "/",
        expires: cookie.expires instanceof Date ? +cookie.expires / 1000 : -1,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: playwrightSameSite(cookie.sameSite),
      }));
    if (cookies.length > 0) await this.context.addCookies(cookies);
  }
}

export async function scrapNewTweetsWithBrowser(
  lastTweetIds?: string[],
): Promise<Scrap> {
  const tweets: NonNullable<Scrap["tweets"]> = [];
  const retweets: Array<Retweet> = [];
  const session = await BrowserTwitterSession.create();

  try {
    const seen = new Set<string>();
    let cursor: string | undefined;
    let finished = false;
    const maxTweets = maxTweetsForScrape(lastTweetIds);
    const oldestTweetDate = oldestTweetDateForScrape();
    let sawTweetWithinDate = false;
    while (!finished) {
      const json = await session.fetchTimelinePage(cursor);
      const page = collectTimelineEntries(json);
      cursor = page.nextCursor;
      if (page.tweets.length === 0) break;

      for (const tweet of page.tweets) {
        if (!tweet.id || seen.has(tweet.id)) continue;
        seen.add(tweet.id);
        tweets.push({
          id: tweet.id,
          twitterScraperJson: JSON.stringify(tweet),
          capturedAt: new Date(),
        });
        if (tweet.retweetedStatus) retweets.push(tweetIntoRetweet(tweet));
        if (lastTweetIds?.includes(tweet.id)) finished = true;
        if (oldestTweetDate && tweet.timeParsed) {
          if (tweet.timeParsed >= oldestTweetDate) {
            sawTweetWithinDate = true;
          } else if (sawTweetWithinDate) {
            finished = true;
          }
        }
        if (tweets.length > maxTweets) finished = true;
      }
      if (!cursor) break;
    }
  } finally {
    if (process.env.TWITTER_BROWSER_KEEP_OPEN !== "1") {
      await session.close();
      await closeSharedTwitterBrowser();
    }
  }

  console.info(`--> ${tweets.length} tweets`);
  return {
    finishedAt: new Date(),
    likedTweets: [],
    retweets,
    tweets,
    totalTweetsSeen: tweets.length,
    uid: nanoid(),
  };
}

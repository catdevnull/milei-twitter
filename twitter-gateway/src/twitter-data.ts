import {
  parseTweetResult,
  type TwitterGraphqlRequestTemplate,
} from "scraper-manzana/browser-twitter";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === "object"
    ? (value as JsonRecord)
    : undefined;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function string(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function number(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function boolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function unwrapResult(value: unknown): JsonRecord | undefined {
  let result = record(value);
  while (result && !result.legacy && result.result) result = record(result.result);
  return result;
}

function rawLegacy(result: JsonRecord | undefined) {
  return record(result?.legacy);
}

export function findBottomCursor(value: unknown): string | undefined {
  let found: string | undefined;
  const visit = (node: unknown) => {
    if (found) return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    const item = record(node);
    if (!item) return;
    if (
      (item.cursorType === "Bottom" || item.entryType === "TimelineTimelineCursor") &&
      typeof item.value === "string"
    ) {
      found = item.value;
      return;
    }
    for (const child of Object.values(item)) visit(child);
  };
  visit(value);
  return found;
}

function collectResults(value: unknown, containerKey: string): JsonRecord[] {
  const results: JsonRecord[] = [];
  const seen = new Set<string>();
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    const item = record(node);
    if (!item) return;
    const container = record(item[containerKey]);
    const result = unwrapResult(container?.result);
    if (result) {
      const key = string(result.rest_id) ?? JSON.stringify(result).slice(0, 200);
      if (!seen.has(key)) {
        seen.add(key);
        results.push(result);
      }
      return;
    }
    for (const child of Object.values(item)) visit(child);
  };
  visit(value);
  return results;
}

export function extractTweetResults(value: unknown) {
  return collectResults(value, "tweet_results");
}

export function extractUserResults(value: unknown) {
  return collectResults(value, "user_results");
}

export function extractProfileResult(value: unknown) {
  const root = record(value);
  return unwrapResult(record(record(root?.data)?.user)?.result);
}

export function socialUser(input: unknown): JsonRecord {
  const result = unwrapResult(input) ?? {};
  const legacy = rawLegacy(result) ?? {};
  const core = record(result.core) ?? {};
  const actionCounts = record(result.action_counts) ?? {};
  const avatar = record(result.avatar) ?? {};
  const banner = record(result.banner) ?? {};
  const dmPermissions = record(result.dm_permissions) ?? {};
  const location = record(result.location) ?? {};
  const privacy = record(result.privacy) ?? {};
  const profileBio = record(result.profile_bio) ?? {};
  const relationshipCounts = record(result.relationship_counts) ?? {};
  const tweetCounts = record(result.tweet_counts) ?? {};
  const verification = record(result.verification) ?? {};
  const website = record(result.website) ?? {};
  const idStr = string(result.rest_id) ?? string(legacy.id_str);
  return {
    id: number(idStr),
    id_str: idStr,
    name: string(legacy.name) ?? string(core.name),
    screen_name: string(legacy.screen_name) ?? string(core.screen_name),
    location: string(legacy.location) ?? string(location.location) ?? "",
    url: string(legacy.url) ?? string(website.url) ?? null,
    description: string(legacy.description) ?? string(profileBio.description) ?? "",
    protected: boolean(legacy.protected) ?? boolean(privacy.protected) ?? false,
    verified:
      boolean(legacy.verified) ??
      boolean(verification.verified) ??
      boolean(result.is_blue_verified) ??
      false,
    followers_count:
      number(legacy.followers_count) ?? number(relationshipCounts.followers) ?? 0,
    friends_count:
      number(legacy.friends_count) ?? number(relationshipCounts.following) ?? 0,
    listed_count: number(legacy.listed_count) ?? 0,
    favourites_count:
      number(legacy.favourites_count) ?? number(actionCounts.favorites_count) ?? 0,
    statuses_count: number(legacy.statuses_count) ?? number(tweetCounts.tweets) ?? 0,
    created_at: toIso(string(legacy.created_at) ?? string(core.created_at)),
    profile_banner_url:
      string(legacy.profile_banner_url) ?? string(banner.image_url) ?? null,
    profile_image_url_https:
      string(legacy.profile_image_url_https) ?? string(avatar.image_url) ?? null,
    can_dm: boolean(legacy.can_dm) ?? boolean(dmPermissions.can_dm) ?? false,
    raw_twitter: result,
  };
}

function toIso(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function tweetUser(result: JsonRecord) {
  const core = record(result.core);
  return record(record(core?.user_results)?.result);
}

export function socialTweet(input: unknown): JsonRecord | undefined {
  const result = unwrapResult(input);
  const parsed = parseTweetResult(result);
  if (!result || !parsed) return undefined;
  const legacy = rawLegacy(result) ?? {};
  const quoted = unwrapResult(record(record(result.quoted_status_result)?.result));
  const retweeted = unwrapResult(
    record(record(legacy.retweeted_status_result)?.result),
  );
  return {
    tweet_created_at: toIso(string(legacy.created_at)),
    id_str: parsed.id,
    text: null,
    full_text: parsed.text,
    source: string(legacy.source) ?? null,
    truncated: boolean(legacy.truncated) ?? false,
    in_reply_to_status_id_str: parsed.inReplyToStatusId ?? null,
    in_reply_to_user_id_str: string(legacy.in_reply_to_user_id_str) ?? null,
    in_reply_to_screen_name: string(legacy.in_reply_to_screen_name) ?? null,
    user: socialUser(tweetUser(result)),
    quoted_status_id_str: parsed.quotedStatusId ?? null,
    is_quote_status: parsed.isQuoted,
    quoted_status: quoted ? socialTweet(quoted) ?? null : null,
    retweeted_status: retweeted ? socialTweet(retweeted) ?? null : null,
    quote_count: number(legacy.quote_count) ?? 0,
    reply_count: parsed.replies ?? 0,
    retweet_count: parsed.retweets ?? 0,
    favorite_count: parsed.likes ?? 0,
    lang: string(legacy.lang) ?? null,
    entities: record(legacy.entities) ?? {},
    extended_entities: record(legacy.extended_entities) ?? undefined,
    views_count: parsed.views ?? 0,
    bookmark_count: parsed.bookmarkCount ?? 0,
    raw_twitter: result,
  };
}

export function timelineResponse(json: unknown) {
  return {
    next_cursor: findBottomCursor(json) ?? null,
    tweets: extractTweetResults(json)
      .map(socialTweet)
      .filter((tweet): tweet is JsonRecord => !!tweet),
  };
}

export function usersResponse(json: unknown) {
  return {
    next_cursor: findBottomCursor(json) ?? null,
    users: extractUserResults(json).map(socialUser),
  };
}

export type { TwitterGraphqlRequestTemplate };

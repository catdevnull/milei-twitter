import type { LikedTweet } from "../../schema";

export function getUsernameFromUrl(url: string): string | null {
  const matches = url.match(/^https:\/\/twitter.com\/(.+?)\//);
  if (!matches) return null;
  const [, username] = matches;
  return username;
}

export function sortMost(tweets: LikedTweet[]) {
  const map = new Map<string, number>();
  for (const tweet of tweets) {
    const username = getUsernameFromUrl(tweet.url);
    if (!username) continue;
    map.set(username, (map.get(username) ?? 0) + 1);
  }
  return Array.from(map)
    .filter(([, n]) => n > 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
}

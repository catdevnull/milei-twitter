import type { LikedTweet } from "../../schema";

export function sortMost(tweets: LikedTweet[]) {
  const map = new Map<string, number>();
  for (const tweet of tweets) {
    const matches = tweet.url.match(/^https:\/\/twitter.com\/(.+?)\//);
    if (!matches) continue;
    const [, username] = matches;
    map.set(username, (map.get(username) ?? 0) + 1);
  }
  return Array.from(map)
    .filter(([, n]) => n > 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
}

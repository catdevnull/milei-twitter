import type { LikedTweet, MiniRetweet } from "../../schema";

export function getUsernameFromUrl(url: string): string | null {
  const matches = url.match(/^https:\/\/twitter.com\/(.+?)\//);
  if (!matches) return null;
  const [, username] = matches;
  return username;
}

/**
 * generates a "top 10" of most interacted users
 * @param handles array of handles for each interaction
 * @returns array of tuples [username, n interactions]
 */
export function sortMost(handles: string[]) {
  const map = new Map<string, number>();
  for (const username of handles) {
    map.set(username, (map.get(username) ?? 0) + 1);
  }
  return (
    Array.from(map)
      // .filter(([, n]) => n > 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
  );
}

/**
 * generates a "top 10" of most liked users
 * @param likes likes to analyze
 * @returns array of tuples [username, n interactions]
 */
export function sortMostLiked(likes: LikedTweet[]) {
  return sortMost(
    likes
      .map((tweet) => getUsernameFromUrl(tweet.url))
      .filter((username): username is string => !!username),
  );
}

/**
 * generates a "top 10" of most retweeted users
 * @param retweets retweets to analyze
 * @returns array of tuples [username, n interactions]
 */
export function sortMostRetweeted(retweets: MiniRetweet[]) {
  return sortMost(
    retweets
      .map((rt) => rt.posterHandle)
      .filter((username): username is string => !!username),
  );
}

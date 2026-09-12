import { analyzeLikeDrops } from "$lib/data-processing/likeDrops";

const snapshots = [
  {
    tweetId: "mock-red",
    tweetedAt: new Date("2026-09-11T18:30:00-03:00"),
    text: "Timeline simulada con una caída fuerte compatible con una purga de cuentas.",
    counts: [8_420, 9_180, 10_240, 9_830, 9_910],
    views: [121_000, 144_000, 168_000, 181_000, 195_000],
  },
  {
    tweetId: "mock-yellow",
    tweetedAt: new Date("2026-09-11T15:10:00-03:00"),
    text: "Timeline simulada con una baja pequeña que también podría ser un unlike normal.",
    counts: [3_100, 3_260, 3_254, 3_330, 3_410],
    views: [52_000, 61_000, 68_000, 75_000, 82_000],
  },
  {
    tweetId: "mock-green",
    tweetedAt: new Date("2026-09-11T12:00:00-03:00"),
    text: "Timeline simulada sin ninguna caída de likes entre snapshots.",
    counts: [1_240, 1_560, 1_890, 2_110, 2_280],
    views: [24_000, 35_000, 46_000, 57_000, 65_000],
  },
];

export function getMockTweetHistory(requestedTweetId: string | null) {
  const tweets = snapshots.map((tweet) => {
    const lastIndex = tweet.counts.length - 1;
    return {
      tweetId: tweet.tweetId,
      tweetedAt: tweet.tweetedAt,
      scrapedAt: new Date("2026-09-12T00:30:00-03:00"),
      favoriteCount: tweet.counts[lastIndex],
      viewsCount: tweet.views[lastIndex],
      text: tweet.text,
      likeDrops: analyzeLikeDrops(tweet.counts),
    };
  });
  const selectedTweetId = tweets.some(
    (tweet) => tweet.tweetId === requestedTweetId,
  )
    ? requestedTweetId!
    : tweets[0].tweetId;
  const selected = snapshots.find(
    (tweet) => tweet.tweetId === selectedTweetId,
  )!;
  const history = selected.counts.map((favoriteCount, index) => ({
    scrapedAt: new Date(
      new Date("2026-09-11T20:30:00-03:00").getTime() + index * 60 * 60_000,
    ),
    favoriteCount,
    viewsCount: selected.views[index],
    likeDelta: index === 0 ? null : favoriteCount - selected.counts[index - 1],
  }));

  return { tweets, selectedTweetId, history, isMock: true };
}

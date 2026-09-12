export const LARGE_LIKE_DROP_MINIMUM = 100;
export const LARGE_LIKE_DROP_RATIO = 0.01;

export type LikeDropLevel = "green" | "yellow" | "red";

export type LikeDropStats = {
  level: LikeDropLevel;
  dropEvents: number;
  totalLikesLost: number;
  maxSingleDrop: number;
  maxSingleDropRate: number;
};

export function classifyLikeDrops(
  stats: Omit<LikeDropStats, "level">,
): LikeDropStats {
  const isLargeDrop =
    stats.maxSingleDrop >= LARGE_LIKE_DROP_MINIMUM &&
    stats.maxSingleDropRate >= LARGE_LIKE_DROP_RATIO;

  return {
    ...stats,
    level: isLargeDrop ? "red" : stats.dropEvents > 0 ? "yellow" : "green",
  };
}

export function analyzeLikeDrops(
  favoriteCounts: readonly number[],
): LikeDropStats {
  let dropEvents = 0;
  let totalLikesLost = 0;
  let maxSingleDrop = 0;
  let maxSingleDropRate = 0;

  for (let index = 1; index < favoriteCounts.length; index += 1) {
    const previous = favoriteCounts[index - 1];
    const current = favoriteCounts[index];
    const drop = previous - current;
    if (drop <= 0) continue;

    dropEvents += 1;
    totalLikesLost += drop;
    maxSingleDrop = Math.max(maxSingleDrop, drop);
    maxSingleDropRate = Math.max(
      maxSingleDropRate,
      previous > 0 ? drop / previous : 0,
    );
  }

  return classifyLikeDrops({
    dropEvents,
    totalLikesLost,
    maxSingleDrop,
    maxSingleDropRate,
  });
}

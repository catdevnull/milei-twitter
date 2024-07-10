import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { formatDuration, intervalToDuration } from "date-fns";
import { es } from "date-fns/locale";
import { parsearLinkDeTwitter } from "../../../../common/parsearLinkDeTwitter";

/**
 * makes an array of timestamps of interactions, prioritizing retweet
 * timestamps over like timestamps as they are more precise.
 * @param likes likes to get interaction times from
 * @param retweets retweets to get interaction times from (will be prioritized over like timestamps)
 */
export function getInteractionTimes(
  likes: { firstSeenAt: Date; url: string }[],
  retweets?: { retweetAt: Date; postId: string }[],
): Date[] {
  let timestamps = new Map<string, Date>();
  for (const like of likes) {
    const parsed = parsearLinkDeTwitter(like.url);
    if (!parsed) throw new Error(`Not a link ${like.url}`);
    else if ("error" in parsed) throw new Error(parsed.error);
    else timestamps.set(parsed.id, like.firstSeenAt);
  }
  if (retweets) {
    for (const retweet of retweets) {
      timestamps.set(retweet.postId, retweet.retweetAt);
    }
  }
  return Array.from(timestamps.values());
}

export type Duration = { start: Dayjs; end: Dayjs };
export function calculateSessions(interactionTimes: Date[]): Duration[] {
  const n = 3;
  const durations = interactionTimes.map((d) => ({
    start: +d,
    end: +d + n * 60 * 1000,
  }));

  type StartEnd = {
    type: "start" | "end";
    date: number;
  };
  const startEnds: Array<StartEnd> = durations
    .flatMap<StartEnd>(({ start, end }) => [
      { type: "start", date: start },
      { type: "end", date: end },
    ])
    .sort(({ date: a }, { date: b }) => a - b);

  // console.debug(startEnds.map((x) => [x.type, x.date.toDate()]));

  let finalStartEnds: Array<StartEnd> = [];

  // https://stackoverflow.com/questions/45109429/merge-sets-of-overlapping-time-periods-into-new-one
  let i = 0;
  for (const startEnd of startEnds) {
    if (startEnd.type === "start") {
      i++;
      if (i === 1) finalStartEnds.push(startEnd);
    } else {
      if (i === 1) finalStartEnds.push(startEnd);
      i--;
    }
  }
  // console.debug(finalStartEnds.map((x) => [x.type, x.date.toDate()]));

  let finalDurations: Array<Duration> = [];

  while (finalStartEnds.length > 0) {
    const [start, end] = finalStartEnds.splice(0, 2);
    if (start.type !== "start") throw new Error("expected start");
    if (end.type !== "end") throw new Error("expected end");
    finalDurations.push({
      start: dayjs(start.date),
      end: dayjs(end.date).subtract(n, "minute").add(2, "minute"),
    });
  }
  return finalDurations;
}

/**
 * @returns number - en milisegundos
 */
export function totalFromDurations(durations: Duration[]): number {
  let total = 0;
  for (const duration of durations) {
    const time = duration.end.diff(duration.start);
    total += time;
  }
  return total;
}

// https://stackoverflow.com/a/65711327
export function formatDurationFromMs(ms: number) {
  const duration = msToDuration(ms);
  return formatDuration(duration, {
    locale: es,
    delimiter: ", ",
    format: ["hours", "minutes"],
  });
}
export function msToDuration(ms: number) {
  return intervalToDuration({ start: 0, end: ms });
}

export function formatTinyDurationFromMs(ms: number) {
  const duration = msToDuration(ms);
  // https://github.com/date-fns/date-fns/issues/2134
  return formatDuration(duration, {
    locale: es,
    format: ["hours", "minutes"],
  })
    .replace(/ horas?/, "h")
    .replace(/ minutos?/, "m");
}

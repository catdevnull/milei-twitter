import type { Dayjs } from "dayjs";
import type { LikedTweet } from "../../schema";
import dayjs from "dayjs";
import { formatDuration, intervalToDuration } from "date-fns";
import { es } from "date-fns/locale";

type LikedTweetDate = {
  firstSeenAt: Date;
};

export type Duration = { start: Dayjs; end: Dayjs };
export function calculateScreenTime(tweets: LikedTweetDate[]): Duration[] {
  const n = 3;
  const durations = tweets
    .map((t) => dayjs(t.firstSeenAt))
    .map((d) => ({ start: d, end: d.add(n, "minute") }));

  type StartEnd = {
    type: "start" | "end";
    date: Dayjs;
  };
  const startEnds: Array<StartEnd> = durations
    .flatMap<StartEnd>(({ start, end }) => [
      { type: "start", date: start },
      { type: "end", date: end },
    ])
    .sort(({ date: a }, { date: b }) => a.diff(b));

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
      start: start.date,
      end: end.date.subtract(n, "minute").add(2, "minute"),
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
  const duration = intervalToDuration({ start: 0, end: ms });
  return formatDuration(duration, {
    locale: es,
    delimiter: ", ",
    format: ["hours", "minutes"],
  });
}
export function formatTinyDurationFromMs(ms: number) {
  const duration = intervalToDuration({ start: 0, end: ms });
  // https://github.com/date-fns/date-fns/issues/2134
  return formatDuration(duration, {
    locale: es,
    format: ["hours", "minutes"],
  })
    .replace(/ horas?/, "h")
    .replace(/ minutos?/, "m");
}

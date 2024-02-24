import dayjs from "dayjs";
import Tz from "dayjs/plugin/timezone";
dayjs.extend(Tz);
import type { MiniLikedTweet } from "../../schema";

export function getLastSleepTime(likedTweets: MiniLikedTweet[]) {
  const diffs = likedTweets
    .sort((a, b) => -b.firstSeenAt - -a.firstSeenAt)
    .map((value, index, array) => {
      const next = array[index + 1];
      if (next) {
        return { ...value, diff: +next.firstSeenAt - +value.firstSeenAt };
      }
      return value;
    })
    .toReversed()
    .map((x, index) => ({ ...x, index }));
  const last = diffs.find(
    (x): x is { index: number; diff: number } & MiniLikedTweet => {
      const time = dayjs(x.firstSeenAt)
        .tz("America/Argentina/Buenos_Aires")
        .hour();
      return (
        "diff" in x && x.diff > 5 * 60 * 60 * 1000 && (time > 21 || time < 4)
      );
    },
  );
  if (!last) return null;
  const ultimoTuitAntesDeDormir = last;
  const primerTuitAlDespertarse = diffs[last.index - 1];

  return { primerTuitAlDespertarse, ultimoTuitAntesDeDormir };
}

<script lang="ts">
  import type { LikedTweet } from "../schema";

  import dayjs from "dayjs";
  import MinMax from "dayjs/plugin/minMax";
  dayjs.extend(MinMax);
  import ChartJs from "./ChartJs.svelte";

  export let tweets: LikedTweet[];

  const hourFormatter = Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
  });

  function byHour(tweets: LikedTweet[]) {
    const map = new Map<number, LikedTweet[]>();

    const allDates = tweets.map((t) => dayjs(t.firstSeenAt));

    const min = dayjs.min(allDates)!;
    const max = dayjs.max(allDates)!;

    for (
      let time = min.set("minute", 0).set("second", 0).set("millisecond", 0);
      time.isBefore(max);
      time = time.add(1, "hour")
    ) {
      map.set(
        +time.toDate(),
        tweets.filter((t) => {
          const d = dayjs(t.firstSeenAt);
          return d.isAfter(time) && d.isBefore(time.add(1, "hour"));
        }),
      );
    }

    // for (const tweet of tweets) {
    //   const key = +dayjs(tweet.firstSeenAt)
    //     .set("minute", 0)
    //     .set("second", 0)
    //     .set("millisecond", 0)
    //     .toDate();
    //   const prev = map.get(key) || [];
    //   map.set(key, [...prev, tweet]);
    // }

    return map;
  }

  $: datasets = [
    {
      label: "Tweets likeados por @JMilei",
      data: Array.from(byHour(tweets)).map(([time, tweets]) => {
        return { x: time, y: tweets.length };
      }),
      backgroundColor: "#ffd801",
    },
  ];

  function onlyUnique(value: any, index: any, self: string | any[]) {
    return self.indexOf(value) === index;
  }
</script>

<ChartJs
  type="bar"
  data={{ datasets }}
  options={{
    responsive: true,
    scales: {
      x: { type: "time" },
    },
  }}
/>

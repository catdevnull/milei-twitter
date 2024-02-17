<script lang="ts">
  import type { LikedTweet } from "../schema";

  import dayjs from "dayjs";
  import MinMax from "dayjs/plugin/minMax";
  dayjs.extend(MinMax);
  import ChartJs from "./ChartJs.svelte";
  import type { ChartData } from "chart.js";

  import { listen } from "svelte-mq-store";
  const isDark = listen("(prefers-color-scheme: dark)", false);

  export let tweets: LikedTweet[];

  const hourFormatter = Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
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

  let datasets: ChartData<
    "bar",
    Array<{ x: string | number; y: number }>
  >["datasets"];
  $: datasets = [
    {
      label: "Tweets likeados por @JMilei",
      data: Array.from(byHour(tweets)).map(([time, tweets]) => {
        return { x: hourFormatter.format(time) + "hs", y: tweets.length };
      }),
      backgroundColor: "#ffd801",
      datalabels: {
        anchor: "end",
        align: "end",
        clamp: true,
        offset: 1,
        color: $isDark ? "#ffffff" : "000000",
      },
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
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
      },
    },
    scales: {
      x: {
        type: "category",
        ticks: {
          autoSkip: true,
          minRotation: 0,
          maxRotation: 0,
          color: $isDark ? "#aaaaaa" : "000000",
        },
        grid: {
          display: false,
        },
      },
      y: {
        border: { display: false },
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        position: "bottom",
      },
      datalabels: {
        formatter(value, context) {
          return value.y === 0 ? "" : value.y;
        },
      },
    },
  }}
/>

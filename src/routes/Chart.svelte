<script lang="ts">
  import type { LikedTweet, Retweet } from "../schema";

  import dayjs, { type Dayjs } from "dayjs";
  import MinMax from "dayjs/plugin/minMax";
  dayjs.extend(MinMax);
  import ChartJs from "./ChartJs.svelte";
  import type { ChartData } from "chart.js";

  import { listen } from "svelte-mq-store";
  const isDark = listen("(prefers-color-scheme: dark)", false);

  export let start: Dayjs;
  export let tweets: { firstSeenAt: Date }[];
  export let retweets: { retweetAt: Date }[];

  const hourFormatter = Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  function byHour(allDates: Dayjs[], start: Dayjs) {
    const map = new Map<number, Dayjs[]>();

    const min = start;
    const max = start.add(1, "day");

    for (
      let time = min.set("minute", 0).set("second", 0).set("millisecond", 0);
      time.isBefore(max);
      time = time.add(1, "hour")
    ) {
      map.set(
        +time.toDate(),
        allDates.filter(
          (d) => d.isAfter(time) && d.isBefore(time.add(1, "hour")),
        ),
      );
    }

    return map;
  }

  type Datasets = ChartData<
    "bar",
    Array<{ x: string | number; y: number }>
  >["datasets"];

  const datalabelConfig: Datasets[0]["datalabels"] = {
    // anchor: "center",
    align: "center",
    clamp: true,
    // offset: 1,
    color: $isDark ? "#ffffff" : "000000",
  };

  let datasets: Datasets;
  $: datasets = [
    {
      label: "Tweets likeados por @JMilei",
      data: Array.from(
        byHour(
          tweets.map((t) => dayjs(t.firstSeenAt)),
          start,
        ),
      ).map(([time, tweets]) => {
        return { x: hourFormatter.format(time) + "hs", y: tweets.length };
      }),
      backgroundColor: "#ffd801",
      stack: "bar",
      datalabels: datalabelConfig,
    },
    {
      label: "Retweets por @JMilei",
      data: Array.from(
        byHour(
          retweets.map((t) => dayjs(t.retweetAt)),
          start,
        ),
      ).map(([time, tweets]) => {
        return { x: hourFormatter.format(time) + "hs", y: tweets.length };
      }),
      backgroundColor: "#0000ff",
      stack: "bar",
      datalabels: datalabelConfig,
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

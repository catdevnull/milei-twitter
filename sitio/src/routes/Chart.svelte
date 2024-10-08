<script lang="ts">
  import dayjs, { type Dayjs } from "dayjs";
  import MinMax from "dayjs/plugin/minMax";
  dayjs.extend(MinMax);
  import ChartJs from "./ChartJs.svelte";
  import type { ChartData } from "chart.js";

  import { listen } from "svelte-mq-store";
  import type { MiniLikedTweet, MiniRetweet, MiniTweet } from "../schema";
  import { likesCutoff } from "$lib/consts";
  const isDark = listen("(prefers-color-scheme: dark)", false);

  type LikedAndRetweeted = { url: string; estimated: Date };

  export let start: Dayjs;
  export let likedTweets: Array<MiniLikedTweet>;
  export let retweets: Array<MiniRetweet>;
  export let tweets: Array<MiniTweet>;

  $: tweetsWithoutRetweets = tweets.filter((t) => !t.isRetweet);

  $: categories = byCategories(likedTweets, retweets);

  const hourFormatter = Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  });

  function getIdsFromUrlWithHandle(urlStr: string) {
    const url = new URL(urlStr);
    if (!["x.com", "twitter.com", "www.twitter.com"].includes(url.hostname)) {
      throw new Error("Not a Twitter link");
    }
    const matches = url.pathname.match(/^\/(\w+)\/status\/(\d+)$/);
    if (!matches) {
      throw new Error("Not a Tweet link");
    }
    let userHandle = matches[1];
    const tweetId = matches[2];
    return { userHandle, tweetId };
  }

  function dateDiff(d1: Date, d2: Date) {
    return Math.abs(+d1 - +d2);
  }
  function likePlusRetweet(
    liked: MiniLikedTweet,
    retweet: MiniRetweet,
  ): LikedAndRetweeted {
    const { userHandle, tweetId } = getIdsFromUrlWithHandle(liked.url);
    // assert
    {
      if (
        userHandle.toLowerCase() !== retweet.posterHandle!.toLowerCase() ||
        tweetId !== retweet.postId
      )
        throw new Error("no es el mismo tweet");
    }

    const diff = dateDiff(liked.firstSeenAt, retweet.retweetAt);
    if (diff > 15 * 60 * 1000)
      console.warn("diferencia de >15min entre like y retweet");
    return {
      url: `https://twitter.com/${userHandle}/status/${tweetId}`,
      // XXX: antes usabamos este promedio pesado entre like y retweet, pero
      // a veces retweetea algo mucho después de que lo likeó, que hacía que
      // se muestren "like+retweet" en horas que no tuvo actividad (ponele 4am).
      // por eso por ahora usamos solo la hora del retweet, que es más precisa
      // (porque viene directo de Twitter). realisticamente no hay una buena
      // manera de hacer esto de la forma que lo estamos graficando ahora.

      // estimated: new Date((+liked.firstSeenAt + +retweet.retweetAt * 3) / 4),
      estimated: retweet.retweetAt,
    };
  }

  /**
   * separates likedTweets and retweets into three categories:
   * - retweeted
   * - liked
   * - liked AND retweeted
   *
   * this deduplicates things that have been liked and retweeted
   */
  function byCategories(
    likedTweets: Array<MiniLikedTweet>,
    retweets: Array<MiniRetweet>,
  ): {
    liked: Array<MiniLikedTweet>;
    retweets: Array<MiniRetweet>;
    likedAndRetweeted: Array<LikedAndRetweeted>;
  } {
    // key is `$userHandle/$tweetId`
    let map = new Map<
      string,
      MiniLikedTweet | MiniRetweet | LikedAndRetweeted
    >();

    for (const tweet of [...likedTweets, ...retweets]) {
      let userHandle: string, tweetId: string;
      if ("firstSeenAt" in tweet) {
        ({ userHandle, tweetId } = getIdsFromUrlWithHandle(tweet.url));
      } else {
        if (!tweet.posterHandle) {
          console.debug(
            `no handle in retweet ${tweet.posterId}/${tweet.postId}`,
          );
          continue;
        }
        ({ userHandle, tweetId } = {
          userHandle: tweet.posterHandle,
          tweetId: tweet.postId,
        });
      }
      const id = `${userHandle}/${tweetId}`.toLowerCase();

      const existing = map.get(id);
      if (existing) {
        if ("estimated" in existing)
          throw new Error("duplicate of liked and retweet");
        if ("firstSeenAt" in tweet) {
          if ("firstSeenAt" in existing)
            throw new Error("duplicate of same kind");
          map.set(id, likePlusRetweet(tweet, existing));
        } else if ("retweetAt" in tweet) {
          if ("retweetAt" in existing)
            throw new Error("duplicate of same kind");
          map.set(id, likePlusRetweet(existing, tweet));
        }
      } else {
        map.set(id, tweet);
      }
    }

    const total = Array.from(map.values());

    return {
      liked: total.filter((x): x is MiniLikedTweet => "firstSeenAt" in x),
      retweets: total.filter((x): x is MiniRetweet => "retweetAt" in x),
      likedAndRetweeted: total.filter(
        (x): x is LikedAndRetweeted => "estimated" in x,
      ),
    };
  }

  function byHour(allDates: Date[], start: Dayjs) {
    const map = new Map<number, Date[]>();

    const min = start;
    const hours = new Array(24)
      .fill(0)
      .map((_, index) =>
        min
          .set("minute", 0)
          .set("second", 0)
          .set("millisecond", 0)
          .add(index, "hour"),
      )
      .map((x) => x.toDate());

    for (const hour of hours) {
      map.set(
        +hour,
        allDates.filter((d) => d > hour && +d < +hour + 60 * 60 * 1000),
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
    color: "#000000",
  };

  let datasets: Datasets;
  $: datasets = [
    ...(categories.likedAndRetweeted.length > 0 &&
    start.isBefore(likesCutoff.cutAt)
      ? [
          {
            label: "Retweet+Like",
            data: Array.from(
              byHour(
                categories.likedAndRetweeted.map((t) => t.estimated),
                start,
              ),
            ).map(([time, tweets]) => {
              return { x: hourFormatter.format(time) + "hs", y: tweets.length };
            }),
            backgroundColor: "#d62828",
            stack: "bar",
            datalabels: { ...datalabelConfig, color: "#ffffff" },
          },
        ]
      : []),
    {
      label: "Retweets",
      data: Array.from(
        byHour(
          categories.retweets.map((t) => t.retweetAt),
          start,
        ),
      ).map(([time, tweets]) => {
        return { x: hourFormatter.format(time) + "hs", y: tweets.length };
      }),
      backgroundColor: "#f77f00",
      stack: "bar",
      datalabels: datalabelConfig,
    },
    ...(categories.liked.length > 0 && start.isBefore(likesCutoff.cutAt)
      ? [
          {
            label: "Likes",
            data: Array.from(
              byHour(
                categories.liked.map((t) => t.firstSeenAt),
                start,
              ),
            ).map(([time, tweets]) => {
              return { x: hourFormatter.format(time) + "hs", y: tweets.length };
            }),
            backgroundColor: "#fcbf49",
            stack: "bar",
            datalabels: datalabelConfig,
          },
        ]
      : []),
    ...(tweetsWithoutRetweets.length > 0 || start.isAfter(dayjs("2024-09-15"))
      ? [
          {
            label: "Tweets",
            data: Array.from(
              byHour(
                tweetsWithoutRetweets.map((t) => t.timestamp),
                start,
              ),
            ).map(([time, tweets]) => {
              return { x: hourFormatter.format(time) + "hs", y: tweets.length };
            }),
            backgroundColor: "#A7D8F7",
            stack: "bar",
            datalabels: datalabelConfig,
          },
        ]
      : []),
  ];
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
          color: $isDark ? "#aaaaaa" : "#000000",
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

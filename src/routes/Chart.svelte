<script lang="ts">
  import dayjs, { type Dayjs } from "dayjs";
  import MinMax from "dayjs/plugin/minMax";
  dayjs.extend(MinMax);
  import ChartJs from "./ChartJs.svelte";
  import type { ChartData } from "chart.js";

  import { listen } from "svelte-mq-store";
  const isDark = listen("(prefers-color-scheme: dark)", false);

  type MiniLikedTweet = { url: string; firstSeenAt: Date };
  type MiniRetweet = {
    posterId: string;
    posterHandle: string | null;
    postId: string;
    retweetAt: Date;
  };
  type LikedAndRetweeted = { url: string; estimated: Date };

  export let start: Dayjs;
  export let likedTweets: Array<MiniLikedTweet>;
  export let retweets: Array<MiniRetweet>;

  $: categories = byCategories(likedTweets, retweets);

  const hourFormatter = Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
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
      estimated: new Date((+liked.firstSeenAt + +retweet.retweetAt) / 2),
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
          console.log(tweet, existing);
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
      label: "Retweet+Like",
      data: Array.from(
        byHour(
          categories.likedAndRetweeted.map((t) => dayjs(t.estimated)),
          start,
        ),
      ).map(([time, tweets]) => {
        return { x: hourFormatter.format(time) + "hs", y: tweets.length };
      }),
      backgroundColor: "#d62828",
      stack: "bar",
      datalabels: { ...datalabelConfig, color: "#ffffff" },
    },
    {
      label: "Retweets",
      data: Array.from(
        byHour(
          categories.retweets.map((t) => dayjs(t.retweetAt)),
          start,
        ),
      ).map(([time, tweets]) => {
        return { x: hourFormatter.format(time) + "hs", y: tweets.length };
      }),
      backgroundColor: "#f77f00",
      stack: "bar",
      datalabels: datalabelConfig,
    },
    {
      label: "Likes",
      data: Array.from(
        byHour(
          categories.liked.map((t) => dayjs(t.firstSeenAt)),
          start,
        ),
      ).map(([time, tweets]) => {
        return { x: hourFormatter.format(time) + "hs", y: tweets.length };
      }),
      backgroundColor: "#fcbf49",
      stack: "bar",
      datalabels: datalabelConfig,
    },
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

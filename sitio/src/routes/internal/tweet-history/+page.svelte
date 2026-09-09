<script lang="ts">
  import TweetHistoryChart from "./TweetHistoryChart.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  const number = new Intl.NumberFormat("en-US");
  const date = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
</script>

<svelte:head>
  <title>Tweet history</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
  <header>
    <h1 class="text-2xl font-semibold">Tweet engagement history</h1>
    <p class="text-sm text-muted-foreground">
      {data.tweets.length} tweets with recorded snapshots
    </p>
  </header>

  {#if data.selectedTweetId}
    {@const selected = data.tweets.find(
      (tweet) => tweet.tweetId === data.selectedTweetId,
    )}
    <section class="rounded-lg border p-4">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div class="max-w-3xl">
          <a
            href={`https://x.com/JMilei/status/${data.selectedTweetId}`}
            target="_blank"
            rel="noreferrer"
            class="font-medium underline"
          >
            {data.selectedTweetId}
          </a>
          <p class="mt-2 whitespace-pre-wrap text-sm">{selected?.text}</p>
        </div>
        <span class="text-sm text-muted-foreground">
          {data.history.length} observations
        </span>
      </div>
      <TweetHistoryChart history={data.history} />
      <details class="mt-4">
        <summary class="cursor-pointer text-sm font-medium">
          All observations
        </summary>
        <div class="mt-2 max-h-72 overflow-auto rounded-md border">
          <table class="w-full text-left text-sm">
            <thead class="sticky top-0 bg-muted">
              <tr>
                <th class="px-3 py-2">Scraped</th>
                <th class="px-3 py-2 text-right">Likes</th>
                <th class="px-3 py-2 text-right">Views</th>
              </tr>
            </thead>
            <tbody>
              {#each [...data.history].reverse() as observation}
                <tr class="border-t">
                  <td class="whitespace-nowrap px-3 py-2">
                    {date.format(new Date(observation.scrapedAt))}
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums">
                    {number.format(observation.favoriteCount)}
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums">
                    {observation.viewsCount === null
                      ? "—"
                      : number.format(observation.viewsCount)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  {/if}

  <section class="overflow-hidden rounded-lg border">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-muted">
          <tr>
            <th class="px-3 py-2">Tweeted</th>
            <th class="px-3 py-2">Tweet</th>
            <th class="px-3 py-2 text-right">Likes</th>
            <th class="px-3 py-2 text-right">Views</th>
            <th class="px-3 py-2">Last scraped</th>
          </tr>
        </thead>
        <tbody>
          {#each data.tweets as tweet}
            <tr
              class:border-blue-500={tweet.tweetId === data.selectedTweetId}
              class="border-t hover:bg-muted/50"
            >
              <td class="whitespace-nowrap px-3 py-2">
                {date.format(new Date(tweet.tweetedAt))}
              </td>
              <td class="max-w-xl px-3 py-2">
                <a
                  href={`?tweet=${tweet.tweetId}`}
                  class="block truncate underline"
                  title={tweet.text}>{tweet.text || tweet.tweetId}</a
                >
              </td>
              <td class="px-3 py-2 text-right tabular-nums">
                {number.format(tweet.favoriteCount)}
              </td>
              <td class="px-3 py-2 text-right tabular-nums">
                {tweet.viewsCount === null
                  ? "—"
                  : number.format(tweet.viewsCount)}
              </td>
              <td class="whitespace-nowrap px-3 py-2">
                {date.format(new Date(tweet.scrapedAt))}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</main>

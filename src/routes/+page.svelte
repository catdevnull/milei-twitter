<script lang="ts">
  import dayjs from "dayjs";
  import type { PageData } from "./$types";
  import Chart from "./Chart.svelte";
  import type { LikedTweet } from "../schema";

  export let data: PageData;

  $: today = data.tweets
    .map((t) => ({
      ...t,
      firstSeenAt: dayjs(t.firstSeenAt),
    }))
    .filter((t) => t.firstSeenAt.isAfter(dayjs().startOf("day")));

  // $: lali = data.tweets.filter(
  //   (t) => t.text && (/lali|Lali/.test(t.text) || /cosquin/i.test(t.text)),
  // );

  function sortMost(tweets: LikedTweet[]) {
    const map = new Map<string, number>();
    for (const tweet of tweets) {
      const matches = tweet.url.match(/^https:\/\/twitter.com\/(.+?)\//);
      if (!matches) continue;
      const [, username] = matches;
      map.set(username, (map.get(username) ?? 0) + 1);
    }
    return Array.from(map)
      .filter(([, n]) => n > 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }

  $: masLikeados = sortMost(data.tweets);
</script>

<div class="flex min-h-screen flex-col justify-center gap-12 p-2">
  <div class="my-4 flex flex-col text-center">
    <h1 class="text-4xl font-bold">
      ¿Cuántos tweets likeó nuestro Presidente hoy?
    </h1>
    <h2 class="text-9xl font-black">{today.length}</h2>
  </div>

  <div class="mx-auto w-full max-w-2xl">
    <Chart tweets={data.tweets} />
  </div>

  <div class="mx-auto">
    <h2 class="text-2xl font-bold">Mas likeados</h2>
    <ol class="list-decimal">
      {#each masLikeados as [persona, n]}
        <li>
          <a
            class="text-medium underline"
            href={`https://twitter.com/${persona}`}
            rel="noreferrer">@{persona}</a
          >: {n}
        </li>
      {/each}
    </ol>
  </div>

  <footer class="text-center">
    hecho por <a
      class="text-blue-600 underline dark:text-blue-300"
      href="https://twitter.com/esoesnulo"
      rel="noreferrer">@esoesnulo</a
    >
  </footer>
</div>

<script lang="ts">
  import dayjs from "dayjs";
  import type { PageData } from "./$types";
  import Chart from "./Chart.svelte";

  export let data: PageData;

  $: today = data.tweets
    .map((t) => ({
      ...t,
      firstSeenAt: dayjs(t.firstSeenAt),
    }))
    .filter((t) => t.firstSeenAt.isAfter(dayjs().startOf("day")));
</script>

<div class="flex min-h-screen flex-col justify-center gap-12 px-2">
  <div class="my-4 flex flex-col text-center">
    <h1 class="text-4xl font-bold">
      ¿Cuantos tweets likeo nuestro Presidente hoy?
    </h1>
    <h2 class="text-9xl font-black">{today.length}</h2>
  </div>

  <div class="mx-auto w-full max-w-2xl">
    <Chart tweets={data.tweets} />
  </div>

  <footer class="text-center">
    hecho por <a
      class="text-blue-600 underline dark:text-blue-300"
      href="https://twitter.com/esoesnulo"
      rel="noreferrer">@esoesnulo</a
    >
  </footer>
</div>

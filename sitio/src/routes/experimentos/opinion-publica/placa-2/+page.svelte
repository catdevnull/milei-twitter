<script lang="ts">
  import { dayjs } from "$lib/consts";
  import { sortMost } from "$lib/data-processing/mostLiked";
  import { formatTinyDurationFromMs } from "$lib/data-processing/screenTime";
  import type { PageData } from "./$types";
  import ClearDay from "@bybas/weather-icons/production/fill/all/clear-day.svg";
  import Cloudy from "@bybas/weather-icons/production/fill/all/cloudy.svg";
  import Thunder from "@bybas/weather-icons/production/fill/all/thunderstorms-rain.svg";

  export let data: PageData;

  const tz = "America/Argentina/Buenos_Aires";
  const weekDayFormatter = Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    weekday: "short",
    timeZone: tz,
  });

  $: allTweets = data.ultimaSemana.flatMap((s) => s.tweets);
  $: mostLiked = sortMost(allTweets);
</script>

<link
  href="https://cdn.jsdelivr.net/gh/repalash/gilroy-free-webfont@fonts/Gilroy-Extrabold.css"
  rel="stylesheet"
/>
<!-- d83926 -->

<div
  class="flex min-h-screen w-screen flex-col items-center bg-[#5ea1b4] font-gilroy font-bold uppercase text-black"
>
  <h1 class="px-8 pb-16 pt-24 text-center text-7xl font-extrabold">
    Los más likeados de la semana
  </h1>

  <div
    class="border-collapse-[separate] mx-auto box-border inline-flex rounded-3xl border-4 border-black bg-[#5ea1b4] py-8 drop-shadow-opinionPublica"
  >
    <ol
      class="mx-auto list-decimal columns-2 gap-x-32 px-8 pl-[2em] text-[2.75rem]"
    >
      {#each mostLiked as [handle, n]}
        <li class="pb-2">@{handle} ({n}❤️)</li>
      {/each}
    </ol>
  </div>
</div>

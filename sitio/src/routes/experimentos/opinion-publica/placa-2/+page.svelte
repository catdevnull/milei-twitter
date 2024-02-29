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

<!-- d83926 -->

<div class="min-h-screen w-screen bg-[#5ea1b4] font-bold text-black">
  <h1 class="px-8 pb-16 pt-24 text-center text-7xl font-extrabold">
    Los más likeados de la semana
  </h1>

  <ol
    class="mx-auto max-w-[90%] list-decimal columns-2 gap-x-32 px-8 pl-[2em] text-[2.75rem]"
  >
    {#each mostLiked as [handle, n]}
      <li class="pb-2">@{handle} {n}❤️</li>
    {/each}
  </ol>
</div>

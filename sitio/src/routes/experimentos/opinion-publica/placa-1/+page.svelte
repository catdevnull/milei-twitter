<script lang="ts">
  import { dayjs } from "$lib/consts";
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

  $: days = data.ultimaSemana.map((s) => s.day);
  $: tweets = data.ultimaSemana.map((s) => s.tweets);
  $: retweets = data.ultimaSemana.map((s) => s.retweets);
  $: screenTime = data.ultimaSemana.map((s) => s.screenTime);
</script>

<!-- d83926 -->

<div class="min-h-screen w-screen bg-[#5ea1b4] font-bold text-black">
  <h1 class="px-8 py-24 text-center text-7xl font-extrabold">
    El pronóstico de Milei en Twitter
  </h1>

  <table class="mx-auto text-center text-4xl">
    <tbody>
      <tr>
        {#each days as day}
          <th class="p-4">
            {weekDayFormatter.format(
              dayjs(day, "YYYY-MM-DD").tz(tz, true).toDate(),
            )}
          </th>
        {/each}
      </tr>
      <tr>
        {#each tweets as tweets}
          <td class="p-4">
            {#if tweets.length < 300}
              <img src={ClearDay} />
            {:else if tweets.length < 550}
              <img src={Cloudy} />
            {:else}
              <img src={Thunder} />
            {/if}
          </td>
        {/each}
      </tr>
      <tr>
        {#each tweets as tweets}
          <td class="p-4">{tweets.length}❤️</td>
        {/each}
      </tr>
      <tr>
        {#each retweets as retweets}
          <td class="p-4">{retweets.length}🔁</td>
        {/each}
      </tr>
      <tr>
        {#each screenTime as screenTime}
          <td class="p-4">
            {formatTinyDurationFromMs(screenTime)}
          </td>
        {/each}
      </tr>
    </tbody>
  </table>
</div>

<script lang="ts">
  import {
    formatTinyDurationFromMs,
  } from "$lib/data-processing/screenTime";
  import { dayjs } from "$lib/consts";

  export let ultimaSemana: any;
  const tz = "America/Argentina/Buenos_Aires";
  const weekDayFormatter = Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    weekday: "short",
    timeZone: tz,
  });
</script>
<table>
  <tbody>
    {#each ultimaSemana as { day, tweets, retweets, screenTime }}
      <tr>
        <th class="px-1 text-right"
          >{weekDayFormatter.format(
            dayjs(day, "YYYY-MM-DD").tz(tz, true).toDate(),
          )}</th
        >
        <td class="px-1 text-right">
          {tweets.length}❤️
        </td>
        <td class="px-1 text-right">
          {retweets.length}🔁
        </td>
        <td class="px-1">
          {formatTinyDurationFromMs(screenTime)}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

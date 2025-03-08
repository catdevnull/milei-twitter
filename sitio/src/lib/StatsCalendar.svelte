<script lang="ts">
  import dayjs from "dayjs";
  import {
    getStatsForDaysInTimePeriod,
    processDataForDays,
  } from "$lib/data-processing/days";
  import { likesCutoff, tz } from "$lib/consts";
  import { formatTinyDurationFromMs } from "$lib/data-processing/screenTime";
  import { HeartIcon, Repeat2Icon } from "lucide-svelte";
  import weekday from "dayjs/plugin/weekday";
  import updateLocale from "dayjs/plugin/updateLocale";
  import "dayjs/locale/es";

  // Initialize the weekday plugin to make Monday the first day of the week
  dayjs.extend(weekday);
  dayjs.extend(updateLocale);
  dayjs.locale("es");

  // Configure dayjs to use Monday as first day of week
  dayjs.updateLocale("es", {
    weekStart: 1,
    weekdays: [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ],
  });

  export let monthData: Awaited<ReturnType<typeof getStatsForDaysInTimePeriod>>;
  export let start: Date;

  let daysWithData: ReturnType<typeof processDataForDays>["daysWithData"];
  let maxTime: ReturnType<typeof processDataForDays>["maxTime"];
  let calendarDays: dayjs.Dayjs[] = [];

  $: currentMonth = dayjs(start).tz(tz);

  $: {
    ({ daysWithData, maxTime } = processDataForDays(monthData));

    const currentMonth = dayjs(start).tz(tz);
    const firstDay = currentMonth.startOf("month");

    // Calculate first day of grid
    const firstDayOfGrid =
      firstDay.day() === 1
        ? firstDay
        : firstDay.day() === 0
          ? firstDay.subtract(6, "day")
          : firstDay.subtract(firstDay.day() - 1, "day");

    // Generate calendar days array
    calendarDays = Array.from({ length: 42 }, (_, i) =>
      firstDayOfGrid.add(i, "day"),
    );
  }
</script>

<div class="grid w-full table-fixed grid-cols-7 gap-[2px]">
  <div class="text-sm *:font-light">lun.</div>
  <div class="text-sm *:font-light">mar.</div>
  <div class="text-sm *:font-light">mié.</div>
  <div class="text-sm *:font-light">jue.</div>
  <div class="text-sm *:font-light">vie.</div>
  <div class="text-sm *:font-light">sáb.</div>
  <div class="text-sm *:font-light">dom.</div>
  {#each calendarDays as day}
    {@const dayStr = day.format("YYYY-MM-DD")}
    {@const dayData = daysWithData.find((x) => x.day === dayStr)}
    {@const level = dayData && dayData.screenTime / maxTime}
    {@const isCurrentMonth = day.month() === currentMonth.month()}

    <div
      class={dayData
        ? "fancy-colors rounded px-1 align-super md:px-2"
        : `px-1 align-super md:px-2 ${isCurrentMonth ? "text-gray-400" : "text-gray-300"}`}
      style={dayData ? `--level: ${level}` : ""}
    >
      <div class="flex h-full flex-col justify-between">
        <div>
          <div>
            {day.format("D")}
          </div>
          {#if dayData}
            <div>
              <strong class="font-black"
                >{formatTinyDurationFromMs(dayData.screenTime)}</strong
              >
            </div>
          {/if}
        </div>
        {#if dayData}
          <div class="">
            {#if !(likesCutoff && (day.isAfter(likesCutoff.cutAt, "day") || day.isSame(likesCutoff.cutAt, "day")))}
              <div class="align-center flex gap-1 py-1 leading-none">
                <HeartIcon class="size-[1em]" />
                {dayData.tweets.length}
              </div>
            {/if}
            <div class="align-center flex gap-1 py-1 leading-none">
              <Repeat2Icon class="size-[1em]" />
              {dayData.retweets.length}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  @media (prefers-color-scheme: dark) {
    .fancy-colors {
      --background: rgb(255 255 255 / var(--level));
    }
  }
  @media (prefers-color-scheme: light) {
    .fancy-colors {
      --background: rgb(255 0 0 / var(--level));
    }
  }
  .fancy-colors {
    background: var(--background, rgb(255 0 0 / var(--level)));
  }
  .fancy-colors > div {
    color: light-dark(black, black);
  }
</style>

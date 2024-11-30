<script lang="ts">
  import dayjs from "dayjs";
  import {
    getStatsForDaysInTimePeriod,
    processDataForDays,
  } from "$lib/data-processing/days";
  import { likesCutoff, tz } from "$lib/consts";
  import { formatTinyDurationFromMs } from "$lib/data-processing/screenTime";
  import { HeartIcon, Repeat2Icon } from "lucide-svelte";

  export let monthData: Awaited<ReturnType<typeof getStatsForDaysInTimePeriod>>;
  export let start: Date;

  let daysWithData: ReturnType<typeof processDataForDays>["daysWithData"];
  let maxTime: ReturnType<typeof processDataForDays>["maxTime"];
  $: ({ daysWithData, maxTime } = processDataForDays(monthData));
</script>

<div class="grid w-full table-fixed grid-cols-7 gap-[2px]">
  <div class="text-sm *:font-light">dom.</div>
  <div class="text-sm *:font-light">lun.</div>
  <div class="text-sm *:font-light">mar.</div>
  <div class="text-sm *:font-light">mié.</div>
  <div class="text-sm *:font-light">jue.</div>
  <div class="text-sm *:font-light">vie.</div>
  <div class="text-sm *:font-light">sáb.</div>
  {#if true}
    {@const firstWeek = dayjs(start).tz(tz).startOf("week")}
    {#each [firstWeek, firstWeek.add(1, "week"), firstWeek.add(2, "week"), firstWeek.add(3, "week"), firstWeek.add(4, "week"), firstWeek.add(5, "week")] as week}
      {#each [week, week.add(1, "day"), week.add(2, "day"), week.add(3, "day"), week.add(4, "day"), week.add(5, "day"), week.add(6, "day")] as weekday}
        <!-- {@const day = dayjs(data.start).add(index * week, "day")} -->
        {@const dayStr = weekday.format("YYYY-MM-DD")}
        {@const dayData = daysWithData.find((x) => x.day === dayStr)}
        {@const level = dayData && dayData.screenTime / maxTime}
        {#if dayData}
          <div
            class="fancy-colors rounded px-1 align-super md:px-2"
            style={dayData && `--level: ${level}`}
          >
            <div class="flex h-full flex-col justify-between">
              <div>
                <div>
                  {weekday.format("D")}
                </div>
                <div>
                  <strong class="font-black"
                    >{formatTinyDurationFromMs(dayData.screenTime)}</strong
                  >
                </div>
              </div>
              <div class="">
                {#if !(likesCutoff && (weekday.isAfter(likesCutoff.cutAt, "day") || weekday.isSame(likesCutoff.cutAt, "day")))}
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
            </div>
          </div>
        {/if}
      {/each}
    {/each}
  {/if}
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

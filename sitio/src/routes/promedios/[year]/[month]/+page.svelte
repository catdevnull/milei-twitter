<script lang="ts">
  import { dayjs, likesCutoff, tz } from "$lib/consts";
  import {
    formatTinyDurationFromMs,
    msToDuration,
  } from "$lib/data-processing/screenTime";
  import AlertInfo from "$lib/components/AlertInfo.svelte";
  import type { PageData } from "./$types";
  import Meta from "$lib/components/Meta.svelte";
  import { formatDuration } from "date-fns";
  import { es } from "date-fns/locale/es";
  import { listen } from "svelte-mq-store";
  import { dateToMonthString } from "./months";

  const isDark = listen("(prefers-color-scheme: dark)", false);
  export let data: PageData;

  const monthFormatter = Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: tz,
  });
  $: monthString = monthFormatter.format(data.start);

  $: daysWithData = data.monthData.filter((day) => day.screenTime > 0);
  $: avg =
    daysWithData.reduce((prev, day) => prev + day.screenTime, 0) /
    daysWithData.length;
  $: avgString = formatDuration(msToDuration(avg), {
    locale: es,
    delimiter: " y ",
    format: ["hours", "minutes"],
  });

  $: minTime = Math.min(...daysWithData.map((day) => day.screenTime));
  $: maxTime = Math.max(...daysWithData.map((day) => day.screenTime));

  $: mesAnterior = dayjs(data.start).tz(tz).subtract(1, "month");
  $: mesAnteriorHref = `/promedios/${mesAnterior.year()}/${dateToMonthString(mesAnterior)}`;
  $: mesProximo = dayjs(data.start).tz(tz).add(1, "month");
  $: mesProximoHref = `/promedios/${mesProximo.year()}/${dateToMonthString(mesProximo)}`;
</script>

<Meta
  keywords={true}
  title={`¿Cuanto tiempo pasó Milei en Twitter en ${monthString}?`}
  description={`Descubrí cuanto tiempo pasó el presidente Javier Milei en Twitter durante ${monthString}.`}
/>

<main class="mx-auto flex min-h-screen max-w-2xl flex-col gap-12 py-4">
  <section class="mx-auto w-full max-w-2xl p-4">
    <h1 class="mb-4 text-5xl font-black leading-[1.1em]">
      Milei pasó un promedio de
      <span class="text-red-600 dark:text-red-500">{avgString}</span>
      diarios en Twitter durante {monthString}.
    </h1>
    <div class="flex flex-wrap gap-2">
      <a
        class="focus:shadow-outline inline-flex items-center justify-center gap-2 rounded-md bg-neutral-950 px-2 py-2 text-sm font-medium leading-none tracking-wide text-white transition-colors duration-200 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 dark:bg-neutral-800"
        href={mesAnteriorHref}
      >
        <span class="icon-[heroicons--arrow-left-20-solid] size-5"></span>
        {monthFormatter.format(mesAnterior.toDate())}
      </a>
      <a
        class="focus:shadow-outline inline-flex items-center justify-center gap-2 rounded-md bg-neutral-950 px-2 py-2 text-sm font-medium leading-none tracking-wide text-white transition-colors duration-200 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 dark:bg-neutral-800"
        href={mesProximoHref}
      >
        {monthFormatter.format(mesProximo.toDate())}
        <span class="icon-[heroicons--arrow-right-20-solid] size-5"></span>
      </a>
    </div>
  </section>

  {#if data.end > likesCutoff.cutAt}
    <div class="px-4">
      <AlertInfo>
        <svelte:fragment slot="title">Likes no disponibles</svelte:fragment>
        A partir del 12 de junio de 2024, la cantidad de "me gusta" en los tweets
        de Milei en Twitter/X ya no está disponible públicamente. Esto significa
        que nuestro cálculo del tiempo estimado se basa únicamente en la cantidad
        de retweets, lo que podría resultar en una subestimación del tiempo real.
      </AlertInfo>
    </div>
  {/if}

  <section class="mx-auto w-full max-w-2xl">
    <div class="grid w-full table-fixed grid-cols-7 gap-[1px]">
      <div class="text-sm *:font-light">dom.</div>
      <div class="text-sm *:font-light">lun.</div>
      <div class="text-sm *:font-light">mar.</div>
      <div class="text-sm *:font-light">mié.</div>
      <div class="text-sm *:font-light">jue.</div>
      <div class="text-sm *:font-light">vie.</div>
      <div class="text-sm *:font-light">sáb.</div>
      {#if true}
        {@const firstWeek = dayjs(data.start).tz(tz).startOf("week")}
        {#each [firstWeek, firstWeek.add(1, "week"), firstWeek.add(2, "week"), firstWeek.add(3, "week"), firstWeek.add(4, "week"), firstWeek.add(5, "week")] as week}
          {#each [week, week.add(1, "day"), week.add(2, "day"), week.add(3, "day"), week.add(4, "day"), week.add(5, "day"), week.add(6, "day")] as weekday}
            <!-- {@const day = dayjs(data.start).add(index * week, "day")} -->
            {@const dayStr = weekday.format("YYYY-MM-DD")}
            {@const dayData = daysWithData.find((x) => x.day === dayStr)}
            <!-- {@const level =
                  dayData &&
                  (dayData.screenTime - minTime) / (maxTime - minTime) +
                    ($isDark ? 0.15 : 0.15)} -->
            {@const level = dayData && dayData.screenTime / maxTime}
            {@const a = $isDark ? "black" : "white"}
            {@const b = $isDark ? "white" : "black"}
            <div
              class="fancy-colors px-1 align-super md:px-2"
              style={dayData && `--level: ${level}`}
            >
              {#if dayData}
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
                        <svg
                          viewBox="0 0 24 24"
                          aria-label="Likes:"
                          class="inline-block size-[1em]"
                          ><g
                            ><path
                              d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"
                              fill="currentColor"
                            ></path></g
                          ></svg
                        >
                        {dayData.tweets.length}
                      </div>
                    {/if}
                    <div class="align-center flex gap-1 py-1 leading-none">
                      <svg
                        viewBox="0 0 24 24"
                        aria-label="Retweets:"
                        class="inline-block size-[1em]"
                        ><g
                          ><path
                            d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"
                            fill="currentColor"
                          ></path></g
                        ></svg
                      >
                      {dayData.retweets.length}
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        {/each}
      {/if}
    </div>
  </section>

  <section class="mx-auto w-full max-w-2xl text-center text-xl">
    <a href="/" class="text-blue-700 underline dark:text-blue-200"
      >milei.nulo.in</a
    >
  </section>
</main>

<style>
  .fancy-colors {
    --background: light-dark(
      rgb(255 0 0 / var(--level)),
      rgb(255 255 255 / var(--level))
    );
    background: var(--background);
  }
  .fancy-colors > div {
    color: light-dark(black, black);
  }
</style>

<script lang="ts">
  import type { PageData } from "./$types";
  import Chart from "./Chart.svelte";
  import Footer from "./Footer.svelte";
  import {
    calculateSessions,
    formatDurationFromMs,
    formatTinyDurationFromMs,
    getInteractionTimes,
    totalFromDurations,
  } from "$lib/data-processing/screenTime";
  import {
    sortMost,
    sortMostLiked,
    sortMostRetweeted,
  } from "$lib/data-processing/mostLiked";
  import { goto } from "$app/navigation";
  import {
    dateFormatter,
    dayjs,
    likesCutoff,
    longDateFormatter,
    monthFormatter,
    timeFormatter,
    tz,
  } from "$lib/consts";
  import "core-js/es/array/to-reversed";
  import Meta from "$lib/components/Meta.svelte";
  import AlertInfo from "$lib/components/AlertInfo.svelte";
  import { onMount } from "svelte";
  import AsSeenIn from "./AsSeenIn.svelte";
  import * as Popover from "$lib/components/ui/popover";
  import Button from "@/components/ui/button/button.svelte";
  import { cn } from "@/utils";
  import Calendar from "@/components/ui/calendar/calendar.svelte";
  import { CalendarIcon, ClockIcon, HeartIcon, Repeat2 } from "lucide-svelte";
  import { CalendarDate, parseDate } from "@internationalized/date";
  import StatsCalendar from "@/StatsCalendar.svelte";
  import StatsCalendarNavigation from "@/StatsCalendarNavigation.svelte";

  export let data: PageData;

  const startOfActivity = dayjs("2024-02-12", "YYYY-MM-DD").toDate();
  $: dudoso = filteredLikedTweets.some((t) => t.firstSeenAt < startOfActivity);
  const crashStart = dayjs("2024-02-19T20:00:00.000-03:00").toDate();
  const crashEnd = dayjs("2024-02-20T01:00:00.000-03:00").toDate();
  $: dudosoCrashScraper = filteredRetweets.some(
    (t) => t.retweetAt > crashStart && t.retweetAt < crashEnd,
  );
  $: dudosoFailVps = filteredRetweets.some(
    (t) =>
      dayjs(t.retweetAt).isAfter(dayjs("2024-03-31T06:25:00.000-03:00")) &&
      dayjs(t.retweetAt).isBefore(dayjs("2024-03-31T10:05:00.000-03:00")),
  );
  $: dudosoCorteLuz = filteredRetweets.some(
    (t) =>
      dayjs(t.retweetAt).isAfter(dayjs("2024-04-02T05:00:00.000-03:00")) &&
      dayjs(t.retweetAt).isBefore(dayjs("2024-04-02T10:05:00.000-03:00")),
  );
  $: dudosoFailVps2 = filteredRetweets.some(
    (t) =>
      dayjs(t.retweetAt).isAfter(dayjs("2024-04-04T08:45:00.000-03:00")) &&
      dayjs(t.retweetAt).isBefore(dayjs("2024-04-04T13:30:00.000-03:00")),
  );
  $: likesCutoffReached =
    likesCutoff &&
    filteredRetweets.some((t) =>
      dayjs(t.retweetAt).isAfter(likesCutoff?.cutAt),
    );

  $: filteredLikedTweets = data.likedTweets;
  $: filteredRetweets = data.retweets;
  $: filteredTweets = data.tweets;

  $: ranges = calculateSessions(
    getInteractionTimes(filteredLikedTweets, filteredRetweets),
  );
  $: totalTime = totalFromDurations(ranges);

  $: masLikeados = sortMostLiked(filteredLikedTweets);
  $: masRetweeteados = sortMostRetweeted(filteredRetweets);

  const lastUpdatedFormatter = Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });

  const weekDayFormatter = Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    weekday: "short",
    timeZone: tz,
  });
  function setQuery(query: string) {
    goto(`/?q=${query}`);
  }

  onMount(() => {
    window.dispatchEvent(new Event("mounted"));
    (window as any).mounted = true;
  });
</script>

<Meta keywords={true} canonical={"https://milei.nulo.lol"} />

<div class="flex min-h-screen flex-col justify-center gap-2">
  <section
    class="mx-auto my-4 flex max-w-2xl flex-col items-center gap-4 text-center"
  >
    <Popover.Root openFocus>
      <Popover.Trigger asChild let:builder>
        <Button
          variant="outline"
          class={cn(
            "justify-start text-left text-xl font-bold",
            !data.query && "text-muted-foreground",
          )}
          builders={[builder]}
        >
          <CalendarIcon class="mr-2 h-4 w-4" />
          {data.query
            ? data.query === "last-24h"
              ? "las últimas 24hs"
              : dateFormatter.format(data.start)
            : "Seleccionar período"}
        </Button>
      </Popover.Trigger>
      <Popover.Content class="w-auto p-0">
        <div class="mx-2 mt-2 flex justify-center">
          <Button
            variant={data.query === "last-24h" ? "default" : "outline"}
            on:click={() => setQuery("last-24h")}
          >
            <ClockIcon class="mr-2 h-4 w-4" />
            Últimas 24hs
          </Button>
        </div>

        <Calendar
          onValueChange={(value) =>
            setQuery(value ? `date:${value.toString()}` : "last-24h")}
          value={data.query === "last-24h"
            ? undefined
            : parseDate(dayjs(data.start).format("YYYY-MM-DD"))}
          initialFocus
          minValue={parseDate(
            dayjs(data.firstLikedTweet?.firstSeenAt).format("YYYY-MM-DD"),
          )}
          maxValue={parseDate(dayjs().tz(tz).format("YYYY-MM-DD"))}
        />
      </Popover.Content>
    </Popover.Root>

    <div class="grid gap-4 text-left md:grid-cols-2">
      <div class="flex flex-col rounded-lg bg-neutral-100 p-4">
        <span class="text-xl">Milei estuvo aproximadamente</span>
        <span class="text-4xl font-black leading-none">
          {formatDurationFromMs(totalTime)}
        </span>
        <span class="text-xl">en Twitter.</span>
      </div>
      <div class="flex items-center gap-4 rounded-lg bg-neutral-100 p-4">
        {#if likesCutoffReached}
          <Repeat2 class="size-12" />
        {:else}
          <HeartIcon class="size-12" />
        {/if}
        <div class="flex flex-col">
          <span class="text-xl"> Milei dio </span>
          <span class="text-4xl font-black leading-none">
            {#if likesCutoffReached}
              {filteredRetweets.length}
            {:else}
              {filteredLikedTweets.length}
            {/if}
          </span>
          <span class="text-xl">
            {#if likesCutoffReached}retweeteos{:else}me gusta{/if}
            en Twitter.
          </span>
        </div>
      </div>
    </div>
  </section>

  {#if dudoso}
    <section class="mx-auto w-full max-w-2xl">
      <p class="text-center text-sm">
        ¡Ojo! Los datos de antes del 12 de febrero pueden ser incorrectos a
        nivel hora.
      </p>
    </section>
  {/if}

  <section class="mx-auto w-full max-w-2xl">
    <Chart
      likedTweets={filteredLikedTweets}
      retweets={filteredRetweets}
      tweets={filteredTweets}
      start={dayjs(data.start)}
    />
  </section>
  {#if dudosoCrashScraper}
    <section class="mx-auto w-full max-w-2xl">
      <p class="text-center text-sm">
        ¡Ojo! Los datos de los likes de la noche del 19 de febrero y las
        primeras horas del 20 de febrero de 2024 pueden estar levemente mal (se
        acumulan likes en las 00hs que deberían estar en la noche del 19 de
        febrero de 2024)
      </p>
    </section>
  {/if}
  {#if dudosoFailVps}
    <section class="mx-auto w-full max-w-2xl">
      <p class="text-center text-sm">
        ¡Ojo! Los datos de los likes de entre las 6:30am y las 10am del 31 de
        marzo son imprecisos (los likes se "acumularon" y quedaron más para las
        10am.)
      </p>
    </section>
  {/if}
  {#if dudosoCorteLuz}
    <section class="mx-auto w-full max-w-2xl">
      <p class="text-center text-sm">
        ¡Ojo! Los datos de los likes de entre las 5:00am y las 10am del 2 de
        abril son imprecisos (los likes se "acumularon" y quedaron más para las
        10am, aunque las interacciones realmente fueron entre ~7:45am-10am.)
      </p>
    </section>
  {/if}
  {#if dudosoFailVps2}
    <section class="mx-auto w-full max-w-2xl">
      <p class="text-center text-sm">
        ¡Ojo! Los datos de los likes de entre las 8:45hs y las 13:30hs del 4 de
        abril son imprecisos (los likes entre esas horas se acumularon en las
        13:30hs)
      </p>
    </section>
  {/if}

  <section
    class="mx-auto flex w-full max-w-2xl flex-col gap-4 bg-neutral-100 p-4 md:rounded-lg"
  >
    <h2 class=" my-2 text-center text-xl font-bold md:text-4xl">
      Su actividad en {dayjs(data.start).isAfter(dayjs().startOf("month"))
        ? "lo que va de"
        : ""}
      {monthFormatter.format(dayjs(data.start).toDate())}
    </h2>

    <StatsCalendar
      monthData={data.monthData}
      start={dayjs(data.start).startOf("month").toDate()}
    />

    <StatsCalendarNavigation
      start={dayjs(data.start).startOf("month").toDate()}
      hasNextMonth={data.hasNextMonth}
      hideIfNotExists={true}
    />
  </section>

  <section class="mx-auto flex w-full max-w-[800px] flex-col py-8">
    <h2 class="mb-4 text-center text-2xl font-bold md:text-4xl">
      💞 Los favoritos de Milei 💞
    </h2>

    <div id="observablehq-title-bfd5728c"></div>
    <div id="observablehq-viewof-top-bfd5728c"></div>
    <div id="observablehq-chart_1-bfd5728c"></div>

    <!-- <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@observablehq/inspector@5/dist/inspector.css"> -->
    <script type="module" async>
      import {
        Runtime,
        Inspector,
      } from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js";
      import define from "https://api.observablehq.com/@rusosnith/retuits-milei@261.js?v=4";
      const observable = () => {
        new Runtime().module(define, (name) => {
          if (name === "title")
            return new Inspector(
              document.querySelector("#observablehq-title-bfd5728c"),
            );
          if (name === "viewof top")
            return new Inspector(
              document.querySelector("#observablehq-viewof-top-bfd5728c"),
            );
          if (name === "chart_1")
            return new Inspector(
              document.querySelector("#observablehq-chart_1-bfd5728c"),
            );
          return ["tuiteroMensual"].includes(name);
        });
      };
      if (window.mounted) observable();
      else window.addEventListener("mounted", observable);
    </script>
    <!-- <iframe
      class="aspect-[800/876] dark:invert"
      width="100%"
      frameborder="0"
      src="https://observablehq.com/embed/@rusosnith/retuits-milei?cells=chart_1"
    ></iframe> -->
    <p class="my-4 text-center text-sm">
      gracias a <a
        href="https://x.com/rusosnith"
        class="text-blue-600 underline dark:text-blue-300">el ruso</a
      >
      por la visualización 🫶 ⋅
      <a
        href="https://observablehq.com/@rusosnith/retuits-milei"
        target="_blank"
        class="text-blue-600 underline dark:text-blue-300">fuente</a
      >
    </p>
  </section>

  <section class="mx-auto flex w-full flex-col py-8">
    <h2 class="mb-4 text-center text-2xl font-bold md:text-4xl">
      Como lo viste en la prensa
    </h2>
    <AsSeenIn />
  </section>

  {#if likesCutoffReached}
    <AlertInfo>
      <svelte:fragment slot="title">Likes no disponibles</svelte:fragment>
      Desde {longDateFormatter.format(likesCutoff?.cutAt)}, ya no podemos
      mostrar los 'me gusta' de Milei en Twitter/X porque ahora son privados.
      <a
        class="text-blue-600 underline dark:text-blue-200"
        href="https://x.com/wanghaofei/status/1793096366132195529"
        >Más información</a
      >. Seguiremos mostrando los retweets públicos.
    </AlertInfo>
  {/if}

  <div class="py-8">
    <Footer />
  </div>
</div>

<style lang="postcss">
  @media (prefers-color-scheme: dark) {
    :global(.plot-d6a7b5) {
      --plot-background: #000;
    }
  }
</style>

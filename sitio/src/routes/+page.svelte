<script lang="ts">
  import type { PageData } from "./$types";
  import Chart from "./Chart.svelte";
  import Footer from "./Footer.svelte";
  import {
    calculateSessions,
    formatDurationFromMs,
    getInteractionTimes,
    totalFromDurations,
  } from "$lib/data-processing/screenTime";
  import { goto } from "$app/navigation";
  import {
    dateFormatter,
    dayjs,
    likesCutoff,
    longDateFormatter,
    monthFormatter,
    tz,
  } from "$lib/consts";
  import "core-js/es/array/to-reversed";
  import Meta from "$lib/components/Meta.svelte";
  import AlertInfo from "$lib/components/AlertInfo.svelte";
  import { onMount } from "svelte";
  import AsSeenIn from "./AsSeenIn.svelte";
  import * as Popover from "$lib/components/ui/popover";
  import { Button, buttonVariants } from "@/components/ui/button/index";
  import { cn } from "@/utils";
  import { Calendar } from "@/components/ui/calendar/index";
  import {
    CalendarIcon,
    ClockIcon,
    HeartIcon,
    LinkIcon,
    Repeat2,
  } from "lucide-svelte";
  import { parseDate } from "@internationalized/date";
  import StatsCalendar from "@/StatsCalendar.svelte";
  import StatsCalendarNavigation from "@/StatsCalendarNavigation.svelte";
  import HeatmapHours from "$lib/HeatmapHours.svelte";

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
    <Popover.Root>
      <Popover.Trigger
        class={cn(
          buttonVariants({ variant: "outline" }),
          "justify-start text-left text-xl font-bold",
          !data.query && "text-muted-foreground",
        )}
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {data.query
          ? data.query === "last-24h"
            ? "las últimas 24hs"
            : dateFormatter.format(data.start)
          : "Seleccionar período"}
      </Popover.Trigger>
      <Popover.Content class="w-auto p-0">
        <div class="mx-2 mt-2 flex justify-center">
          <Button
            variant={data.query === "last-24h" ? "default" : "outline"}
            onclick={() => setQuery("last-24h")}
          >
            <ClockIcon class="mr-2 h-4 w-4" />
            Últimas 24hs
          </Button>
        </div>
        <Calendar
          type="single"
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

    <div class="grid gap-4 px-2 text-left md:grid-cols-2">
      <div
        class="flex flex-col rounded-lg bg-neutral-100 p-4 dark:bg-neutral-800"
      >
        <span class="text-xl">Milei estuvo aproximadamente</span>
        <span class="text-4xl font-black leading-none">
          {formatDurationFromMs(totalTime)}
        </span>
        <span class="text-xl">en Twitter.</span>
      </div>
      <div
        class="flex items-center gap-4 rounded-lg bg-neutral-100 p-4 dark:bg-neutral-800"
      >
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
    class="mx-auto flex w-full max-w-2xl flex-col gap-4 bg-neutral-100 p-4 md:rounded-lg dark:bg-neutral-800"
  >
    <h2 class="my-2 text-center text-xl font-bold md:text-4xl">
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

  <section
    class="mx-auto w-full max-w-2xl bg-neutral-100 p-4 md:rounded-lg dark:bg-neutral-800"
  >
    <h2 class="mb-2 text-center text-xl font-bold md:text-3xl">
      ¿Cuándo suele estar activo en Twitter?
    </h2>
    <p class="text-muted-foreground mb-4 text-center text-sm">
      Basado en tweets y retweets de los últimos 90 días.
    </p>
    <HeatmapHours matrix={data.hourHeatmap} />
  </section>

  <section class="mx-auto flex w-full max-w-[800px] flex-col py-8">
    <h2 class="mb-4 text-center text-2xl font-bold md:text-4xl">
      💞 Los favoritos de Milei 💞
    </h2>

    <div id="observablehq-title-d59580eb"></div>
    <div id="observablehq-viewof-top-d59580eb"></div>
    <div id="observablehq-chart-d59580eb"></div>

    <!-- <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@observablehq/inspector@5/dist/inspector.css"> -->

    <script type="module" async>
      import {
        Runtime,
        Inspector,
      } from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js";
      import define from "https://api.observablehq.com/@rusosnith/retuits-milei@latest.js?v=4";
      const observable = () => {
        new Runtime().module(define, (name) => {
          if (name === "title")
            return new Inspector(
              document.querySelector("#observablehq-title-d59580eb"),
            );
          if (name === "viewof top")
            return new Inspector(
              document.querySelector("#observablehq-viewof-top-d59580eb"),
            );
          if (name === "chart")
            return new Inspector(
              document.querySelector("#observablehq-chart-d59580eb"),
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
    <div
      class="mx-auto flex flex-col items-center justify-center gap-4 bg-neutral-100 p-2 md:mb-8 md:flex-row md:rounded-lg md:text-lg dark:bg-neutral-800"
    >
      <enhanced:img
        class="w-[300px] rounded-lg"
        src="$lib/assets/time-cover-milei.png"
        alt="Milei en la prensa"
        loading="lazy"
      />
      <div class="flex flex-col items-start gap-2">
        <blockquote class="max-w-[400px]">
          <span class="text-muted-foreground">[..]</span> The President often
          stays up until the early morning hours, scrolling on X, formerly
          Twitter.
          <strong
            >He’s so prolific on the platform that an Argentine programmer set
            up a popular website called “How many tweets has our President liked
            today?” On the day we spoke, he liked or retweeted 336 posts, much
            of it delirious all-caps praise of himself.</strong
          >
          <span class="text-muted-foreground">[..]</span>
        </blockquote>
        <Button
          variant="outline"
          href="https://time.com/6980600/javier-milei-argentina-interview/#:~:text=He%E2%80%99s%20so%20prolific%20on%20the%20platform%20that%20an%20Argentine%20programmer%20set%20up%20a%20popular%20website%20called%20%E2%80%9CHow%20many%20tweets%20has%20our%20President%20liked%20today%3F%E2%80%9D%20On%20the%20day%20we%20spoke%2C%20he%20liked%20or%20retweeted%20336%20posts%2C%20much%20of%20it%20delirious%20all%2Dcaps%20praise%20of%20himself."
        >
          <LinkIcon class="mr-2 h-4 w-4" />
          Fuente
        </Button>
      </div>
    </div>
    <AsSeenIn />
  </section>

  {#if likesCutoffReached}
    <AlertInfo>
      <svelte:fragment slot="title">Likes no disponibles</svelte:fragment>
      Desde {longDateFormatter.format(likesCutoff?.cutAt)}, ya no podemos
      mostrar los 'me gusta' de Milei en Twitter/X porque ahora son privados.
      <a
        class="text-blue-700 underline dark:text-blue-200"
        href="https://x.com/wanghaofei/status/1793096366132195529"
        >Más información</a
      >. Seguiremos mostrando los retweets públicos.
    </AlertInfo>
  {/if}

  <div class="py-8">
    <Footer />
  </div>
</div>

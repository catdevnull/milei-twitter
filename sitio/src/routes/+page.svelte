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
    timeFormatter,
    tz,
  } from "$lib/consts";
  import "core-js/es/array/to-reversed";
  import { DatePicker } from "@svelte-plugins/datepicker";
  import Meta from "$lib/components/Meta.svelte";
  import AlertInfo from "$lib/components/AlertInfo.svelte";
  import { dateToMonthString } from "./promedios/[year]/[month]/months";

  export let data: PageData;

  const startOfActivity = dayjs("2024-02-12", "YYYY-MM-DD").toDate();
  $: dudoso = filteredTweets.some((t) => t.firstSeenAt < startOfActivity);
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

  $: filteredTweets = data.tweets;
  $: filteredRetweets = data.retweets;

  $: ranges = calculateSessions(
    getInteractionTimes(filteredTweets, filteredRetweets),
  );
  $: totalTime = totalFromDurations(ranges);

  $: masLikeados = sortMostLiked(filteredTweets);
  $: masRetweeteados = sortMostRetweeted(filteredRetweets);

  $: ultimaSemana = data.ultimaSemana;

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
  const monthFormatter = Intl.DateTimeFormat("es-AR", {
    month: "long",
  });
  function setQuery(query: string) {
    goto(`/?q=${query}`);
  }

  function generarOpcionesDias(
    start: Date,
  ): Array<{ label: string; query: string }> {
    const hoy = dayjs().tz(tz).startOf("day").toDate();
    const getWeeklyQuery = (date: Date) =>
      `date:${dayjs(date).format("YYYY-MM-DD")}`;
    const weeklyOpcion = (date: Date) => ({
      label: weekDayFormatter.format(date),
      query: getWeeklyQuery(date),
      date,
    });
    const opciones = [
      { label: "las últimas 24hs", query: "last-24h" },
      {
        label: `hoy, ${weekDayFormatter.format(hoy)}`,
        query: getWeeklyQuery(hoy),
        date: hoy,
      },
      ...ultimaSemana
        .toReversed()
        .map((d) => dayjs(d.day, "YYYY-MM-DD").tz(tz, true).toDate())
        .filter((d) => +d !== +hoy)
        .map((date) => weeklyOpcion(date)),
    ];
    if (!opciones.some((op) => op.date && +start == +op.date)) {
      opciones.push({
        query: getWeeklyQuery(start),
        label: dateFormatter.format(start),
        date: start,
      });
    }
    return opciones;
  }
  $: opcionesDias = generarOpcionesDias(data.start);

  const dowLabels = ["D", "L", "M", "X", "J", "V", "S"];
  const monthLabels = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  let isDatePickerOpen = false;
  const toggleDatePicker = () => (isDatePickerOpen = !isDatePickerOpen);

  const onDayClick = (evt: any) =>
    setQuery(`date:${dayjs(evt.startDate).format("YYYY-MM-DD")}`);

  let duende = false;
  let easterEggClicks = 0;
  function easterEggClick() {
    easterEggClicks++;
    if (easterEggClicks > 4) {
      duende = true;
    }
  }
</script>

<Meta keywords={true} canonical={"https://milei.nulo.in"} />

<div
  class="flex min-h-screen flex-col justify-center gap-2 p-2"
  class:milei-duende={duende}
>
  <section class="mx-auto my-4 flex max-w-2xl flex-col text-center">
    <h1 class="text-4xl font-bold">
      ¿Cuántos tweets
      {#if likesCutoffReached}retweeteo{:else}likeó{/if}
      nuestro
      <button on:click={easterEggClick}
        >{#if duende}presiduende{:else}Presidente{/if}</button
      >
      <div class="inline-flex flex-wrap justify-end gap-2">
        <select
          on:change={(e) => setQuery(e.currentTarget.value)}
          value={data.query}
          class="w-[300px] rounded-md px-2"
        >
          {#each opcionesDias as { label, query }}
            <option value={query}>{label}</option>
          {/each}
        </select>
        <DatePicker
          bind:isOpen={isDatePickerOpen}
          includeFont={false}
          align="right"
          startDate={data.start}
          {onDayClick}
          enabledDates={[
            `${dayjs(data.firstLikedTweet?.firstSeenAt).format("MM/DD/YYYY")}:${dayjs().tz(tz).format("MM/DD/YYYY")}`,
          ]}
          {dowLabels}
          {monthLabels}
        >
          <button
            type="button"
            class="focus:shadow-outline inline-flex items-center justify-center rounded-md bg-neutral-950 p-1 font-medium tracking-wide text-white transition-colors duration-200 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:focus:ring-neutral-950"
            on:click={toggleDatePicker}
          >
            <span class="icon-[heroicons--calendar-solid]"></span>
          </button>
        </DatePicker>
      </div>
      ?
    </h1>
    <h2 class="text-9xl font-black">
      {#if likesCutoffReached}
        {filteredRetweets.length}
      {:else}
        {filteredTweets.length}
      {/if}
    </h2>
    <small>
      <a
        href="https://milei.nulo.in"
        class="text-blue-600 underline dark:text-blue-200">milei.nulo.in</a
      >
      {#if data.lastUpdated}
        - actualizado {lastUpdatedFormatter.format(data.lastUpdated.finishedAt)}
      {/if}
    </small>
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
      likedTweets={filteredTweets}
      retweets={filteredRetweets}
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

  <section class="mx-auto flex flex-col items-start gap-16 px-8 md:flex-row">
    <div class="max-w-[400px]">
      <h2 class="text-2xl font-bold">Tiempo en Twitter</h2>
      <p>
        🤖 Reviso la cuenta <a
          href="https://twitter.com/JMilei"
          class="text-blue-600 underline dark:text-blue-200"
          rel="noreferrer">@JMilei</a
        >, registro sus interacciones y genero un estimado de cuanto tiempo
        habría usado Twitter:
      </p>
      <p class="text-4xl font-black">
        {formatDurationFromMs(totalTime)}
      </p>
      <!-- <p class="my-1 text-sm leading-tight">
        * Esto es un experimento que automáticamente revisa los momentos en
        donde Milei le da "me gusta" a cosas y genera un estimado de cuanto
        tiempo estuvo usando Twitter.
      </p> -->
      <details>
        <summary>Rangos de tiempo estimados</summary>
        <ol class="list-decimal pl-8">
          {#each ranges as { start, end }}
            <li>
              {timeFormatter.format(start.toDate())} - {timeFormatter.format(
                end.toDate(),
              )}
            </li>
          {/each}
        </ol>
      </details>
    </div>
    <div>
      {#if likesCutoffReached}
        <h2 class="text-center text-2xl font-bold">Mas retweeteados</h2>
        <ol class="list-decimal pl-8">
          {#each masRetweeteados as [persona, n]}
            <li>
              <a
                class="text-medium underline"
                href={`https://twitter.com/${persona}`}
                rel="noopener noreferrer"
                target="_blank">@{persona}</a
              >: {n}
            </li>
          {/each}
        </ol>
      {:else}
        <h2 class="text-center text-2xl font-bold">Mas likeados</h2>
        <ol class="list-decimal pl-8">
          {#each masLikeados as [persona, n]}
            <li>
              <a
                class="text-medium underline"
                href={`https://twitter.com/${persona}`}
                rel="noopener noreferrer"
                target="_blank">@{persona}</a
              >: {n}
            </li>
          {/each}
        </ol>
      {/if}
    </div>
  </section>

  <!-- <section class="mx-auto flex max-w-2xl flex-col">
    <p class="px-4">
      Esta página web revisa automáticamente la cuenta , registra los "me gusta" y genera un estimado de cuanto tiempo estuvo el
      presidente usando Twitter.
    </p>
  </section> -->

  <section class="mx-auto flex max-w-2xl flex-col py-8">
    <h2 class="text-center text-2xl font-bold">Semanal</h2>

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
              {#if !(likesCutoff && (dayjs(day, "YYYY-MM-DD").isAfter(likesCutoff.cutAt, "day") || dayjs(day, "YYYY-MM-DD").isSame(likesCutoff.cutAt, "day")))}
                {tweets.length}❤️
              {/if}
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

    <a
      href={`/promedios/${dayjs(data.start).year()}/${dateToMonthString(dayjs(data.start))}`}
      class="mt-12 text-2xl text-blue-600 underline dark:text-blue-200"
      >Ver promedio de {monthFormatter.format(data.start)}</a
    >
  </section>
  <div class="py-8">
    <Footer />
  </div>
</div>

<style lang="postcss">
  :global(.datepicker) {
    display: inline-flex;
  }
  :global(.datepicker) button {
    @apply text-4xl;
  }

  .milei-duende {
    background:
      linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)),
      center / cover no-repeat url("$lib/assets/milei-duende.webp");
    background-attachment: fixed;
  }

  @media (prefers-color-scheme: dark) {
    .milei-duende {
      background:
        linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)),
        center / cover no-repeat url("$lib/assets/milei-duende.webp");
    }
  }
</style>

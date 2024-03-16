<script lang="ts">
  import type { PageData } from "./$types";
  import Chart from "./Chart.svelte";
  import {
    calculateScreenTime,
    formatDurationFromMs,
    formatTinyDurationFromMs,
    totalFromDurations,
  } from "$lib/data-processing/screenTime";
  import { sortMost } from "$lib/data-processing/mostLiked";
  import { goto } from "$app/navigation";
  import { dayjs } from "$lib/consts";
  import "core-js/es/array/to-reversed";
  import { DatePicker } from "@svelte-plugins/datepicker";

  const tz = "America/Argentina/Buenos_Aires";

  export let data: PageData;

  $: dudoso = filteredTweets.some((t) =>
    dayjs(t.firstSeenAt).isBefore(dayjs("2024-02-12", "YYYY-MM-DD")),
  );
  $: dudosoCrashScraper = filteredRetweets.some(
    (t) =>
      dayjs(t.retweetAt).isAfter(dayjs("2024-02-19T20:00:00.000-03:00")) &&
      dayjs(t.retweetAt).isBefore(dayjs("2024-02-20T01:00:00.000-03:00")),
  );

  $: filteredTweets = data.tweets;
  $: filteredRetweets = data.retweets;

  $: ranges = calculateScreenTime(filteredTweets);
  $: totalTime = totalFromDurations(ranges);

  $: masLikeados = sortMost(filteredTweets);

  $: ultimaSemana = data.ultimaSemana;

  const timeFormatter = Intl.DateTimeFormat("es-AR", {
    timeStyle: "medium",
    timeZone: tz,
  });

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
  const dateFormatter = Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    weekday: "short",
    month: "short",
    timeZone: tz,
  });

  function setQuery(query: string) {
    goto(`/?q=${query}`);
  }

  function generarOpcionesDias(
    start: Date,
  ): Array<{ label: string; query: string }> {
    const hoy = dayjs().tz(tz).toDate();
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
    console.debug(start, opciones);
    if (!opciones.some(({ date }) => date && +start == +date)) {
      opciones.push({
        query: getWeeklyQuery(start),
        label: dateFormatter.format(start),
        date: start,
      });
    }
    return opciones;
  }
  $: opcionesDias = generarOpcionesDias(data.start);

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

<div
  class="flex min-h-screen flex-col justify-center gap-12 p-2"
  class:milei-duende={duende}
>
  <section class="my-4 flex flex-col text-center">
    <h1 class="text-4xl font-bold">
      ¿Cuántos tweets likeó nuestro <span on:click={easterEggClick}
        >{#if duende}presiduende{:else}Presidente{/if}</span
      >
      <div class="inline-flex flex-wrap justify-end gap-2">
        <select
          on:change={(e) => setQuery(e.currentTarget.value)}
          value={data.query}
          class="rounded-md px-2"
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
    <h2 class="text-9xl font-black">{filteredTweets.length}</h2>
    <small>
      <a
        href="https://milei.nulo.in"
        class="text-blue-600 underline dark:text-blue-200">milei.nulo.in</a
      >
      - actualizado {lastUpdatedFormatter.format(data.lastUpdated?.at)}
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

  <section class="mx-auto flex flex-col items-start gap-16 px-8 md:flex-row">
    <div class="max-w-[400px]">
      <h2 class="text-2xl font-bold">Tiempo en Twitter</h2>
      <p>
        🤖 Reviso la cuenta <a
          href="https://twitter.com/JMilei"
          class="text-blue-600 underline dark:text-blue-200"
          rel="noreferrer">@JMilei</a
        >, registro los "me gusta" y genero un estimado de cuanto tiempo habría
        usado Twitter:
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
    </div>
  </section>

  <!-- <section class="mx-auto flex max-w-2xl flex-col">
    <p class="px-4">
      Esta página web revisa automáticamente la cuenta , registra los "me gusta" y genera un estimado de cuanto tiempo estuvo el
      presidente usando Twitter.
    </p>
  </section> -->

  <section class="mx-auto flex max-w-2xl flex-col">
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
  </section>

  <footer class="flex flex-col gap-4 text-center">
    <div>
      Compartir por
      <a
        class="rounded bg-green-600 px-3 py-2 font-medium text-white"
        href={`https://api.whatsapp.com/send?text=${encodeURIComponent("¿Cuántos tweets likeó nuestro Presidente las últimas 24 horas? https://milei.nulo.in/?ref=wsp-link")}`}
        >WhatsApp</a
      >
    </div>
    <div>
      hecho por <a
        class="text-blue-600 underline dark:text-blue-200"
        href="https://twitter.com/esoesnulo"
        rel="noreferrer">@esoesnulo</a
      >
      -
      <a class="text-blue-600 underline dark:text-blue-200" href="/info/faq"
        >preguntas frecuentes</a
      >
    </div>
  </footer>
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

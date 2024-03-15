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

  const tz = "America/Argentina/Buenos_Aires";

  export let data: PageData;

  const startOfActivity = dayjs("2024-02-12", "YYYY-MM-DD").toDate();
  $: dudoso = filteredTweets.some((t) => t.firstSeenAt < startOfActivity);
  const crashStart = dayjs("2024-02-19T20:00:00.000-03:00").toDate();
  const crashEnd = dayjs("2024-02-20T01:00:00.000-03:00").toDate();
  $: dudosoCrashScraper = filteredRetweets.some(
    (t) => t.retweetAt > crashStart && t.retweetAt < crashEnd,
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

  function setQuery(
    event: Event & { currentTarget: EventTarget & HTMLSelectElement },
  ) {
    const query = event.currentTarget.value;
    goto(`/?q=${query}`);
  }
</script>

<div class="flex min-h-screen flex-col justify-center gap-12 p-2">
  <section class="my-4 flex flex-col text-center">
    <h1 class="text-4xl font-bold">
      ¿Cuántos tweets likeó nuestro Presidente
      <select on:change={setQuery} value={data.query}>
        <option value="last-24h">las últimas 24hs</option>
        <option value={`date:${dayjs().tz(tz).format("YYYY-MM-DD")}`}
          >hoy, {weekDayFormatter.format(new Date())}</option
        >
        {#each ultimaSemana.toReversed().slice(1) as { day }}
          <option value={`date:${day}`}
            >{weekDayFormatter.format(
              dayjs(day, "YYYY-MM-DD").tz(tz, true).toDate(),
            )}</option
          >
        {/each}
      </select>
      ?
    </h1>
    <h2 class="text-9xl font-black">{filteredTweets.length}</h2>
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

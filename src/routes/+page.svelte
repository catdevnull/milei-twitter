<script lang="ts">
  import dayjs, { type Dayjs } from "dayjs";
  import Utc from "dayjs/plugin/utc";
  import Tz from "dayjs/plugin/timezone";
  import CustomParseFormat from "dayjs/plugin/customParseFormat";
  dayjs.extend(Utc);
  dayjs.extend(Tz);
  dayjs.extend(CustomParseFormat);
  import { formatDuration, intervalToDuration } from "date-fns";
  import { es } from "date-fns/locale";

  import type { PageData } from "./$types";
  import Chart from "./Chart.svelte";
  import type { LikedTweet, MiniRetweet } from "../schema";

  export let data: PageData;

  type Filter = "today" | "last-24h" | `date:${string}`;

  let filter: Filter = "today";
  $: startTimeFilter = startTimeFromFilter(filter);

  $: dudoso = filteredTweets.some((t) =>
    dayjs(t.firstSeenAt).isBefore(dayjs("2024-02-12", "YYYY-MM-DD")),
  );
  $: dudosoCrashScraper = filteredRetweets.some(
    (t) =>
      dayjs(t.retweetAt).isAfter(dayjs("2024-02-19T20:00:00.000-03:00")) &&
      dayjs(t.retweetAt).isBefore(dayjs("2024-02-20T01:00:00.000-03:00")),
  );

  function startTimeFromFilter(filter: Filter) {
    switch (filter) {
      case "today":
        return dayjs().tz("America/Argentina/Buenos_Aires").startOf("day");
      case "last-24h":
        return dayjs().subtract(24, "hour");
      default:
        const dateStr = filter.slice(5);
        const date = dayjs(dateStr, "YYYY-MM-DD").tz(
          "America/Argentina/Buenos_Aires",
          true,
        );
        return date;
    }
  }

  const filterByStartTime = (startTime: Dayjs) => (date: Dayjs) =>
    date.isAfter(startTime) && date.isBefore(startTime.add(1, "day"));

  $: filteredTweets = data.tweets.filter((t) =>
    filterByStartTime(startTimeFilter)(dayjs(t.firstSeenAt)),
  );
  $: filteredRetweets = data.retweets.filter((t) =>
    filterByStartTime(startTimeFilter)(dayjs(t.retweetAt)),
  );

  // $: lali = data.tweets.filter(
  //   (t) => t.text && (/lali|Lali/.test(t.text) || /cosquin/i.test(t.text)),
  // );

  type Duration = { start: Dayjs; end: Dayjs };
  function calculateScreenTime(tweets: LikedTweet[]): Duration[] {
    const n = 3;
    const durations = tweets
      .map((t) => dayjs(t.firstSeenAt))
      .map((d) => ({ start: d, end: d.add(n, "minute") }));

    type StartEnd = {
      type: "start" | "end";
      date: Dayjs;
    };
    const startEnds: Array<StartEnd> = durations
      .flatMap<StartEnd>(({ start, end }) => [
        { type: "start", date: start },
        { type: "end", date: end },
      ])
      .sort(({ date: a }, { date: b }) => a.diff(b));

    // console.debug(startEnds.map((x) => [x.type, x.date.toDate()]));

    let finalStartEnds: Array<StartEnd> = [];

    // https://stackoverflow.com/questions/45109429/merge-sets-of-overlapping-time-periods-into-new-one
    let i = 0;
    for (const startEnd of startEnds) {
      if (startEnd.type === "start") {
        i++;
        if (i === 1) finalStartEnds.push(startEnd);
      } else {
        if (i === 1) finalStartEnds.push(startEnd);
        i--;
      }
    }
    // console.debug(finalStartEnds.map((x) => [x.type, x.date.toDate()]));

    let finalDurations: Array<Duration> = [];

    while (finalStartEnds.length > 0) {
      const [start, end] = finalStartEnds.splice(0, 2);
      if (start.type !== "start") throw new Error("expected start");
      if (end.type !== "end") throw new Error("expected end");
      finalDurations.push({
        start: start.date,
        end: end.date.subtract(n, "minute").add(2, "minute"),
      });
    }
    return finalDurations;
  }

  /**
   * @returns number - en milisegundos
   */
  function totalFromDurations(durations: Duration[]): number {
    let total = 0;
    for (const duration of durations) {
      const time = duration.end.diff(duration.start);
      total += time;
    }
    return total;
  }

  // https://stackoverflow.com/a/65711327
  function formatDurationFromMs(ms: number) {
    const duration = intervalToDuration({ start: 0, end: ms });
    return formatDuration(duration, {
      locale: es,
      delimiter: ", ",
      format: ["hours", "minutes"],
    });
  }
  function formatTinyDurationFromMs(ms: number) {
    const duration = intervalToDuration({ start: 0, end: ms });
    // https://github.com/date-fns/date-fns/issues/2134
    return formatDuration(duration, {
      locale: es,
      // delimiter: ", ",
      format: ["hours", "minutes"],
    })
      .replace(/ horas?/, "h")
      .replace(/ minutos?/, "m");
  }

  $: ranges = calculateScreenTime(
    filteredTweets,
    // .filter((t) =>
    //   dayjs(t.firstSeenAt).isAfter(dayjs().subtract(8, "hour")),
    // ),
  );
  $: totalTime = totalFromDurations(ranges);

  function sortMost(tweets: LikedTweet[]) {
    const map = new Map<string, number>();
    for (const tweet of tweets) {
      const matches = tweet.url.match(/^https:\/\/twitter.com\/(.+?)\//);
      if (!matches) continue;
      const [, username] = matches;
      map.set(username, (map.get(username) ?? 0) + 1);
    }
    return Array.from(map)
      .filter(([, n]) => n > 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }

  $: masLikeados = sortMost(filteredTweets);

  function lastWeek(
    allLiked: Array<LikedTweet>,
    allRetweets: Array<MiniRetweet>,
  ) {
    const today = dayjs
      .tz(undefined, "America/Argentina/Buenos_Aires")
      .startOf("day");

    const days = [
      today.subtract(7, "day"),
      today.subtract(6, "day"),
      today.subtract(5, "day"),
      today.subtract(4, "day"),
      today.subtract(3, "day"),
      today.subtract(2, "day"),
      today.subtract(1, "day"),
      today,
    ];

    return days.map((day) => {
      const tweets = allLiked.filter((t) => {
        const date = dayjs(t.firstSeenAt);
        return date.isAfter(day) && date.isBefore(day.add(1, "day"));
      });
      const retweets = allRetweets.filter((t) => {
        const date = dayjs(t.retweetAt);
        return date.isAfter(day) && date.isBefore(day.add(1, "day"));
      });
      return {
        day,
        tweets,
        retweets,
        screenTime: totalFromDurations(calculateScreenTime(tweets)),
      };
    });
  }

  $: ultimaSemana = lastWeek(data.tweets, data.retweets);

  const timeFormatter = Intl.DateTimeFormat("es-AR", {
    timeStyle: "medium",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const dateFormatter = Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const weekDayFormatter = Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    weekday: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  });
</script>

<div class="flex min-h-screen flex-col justify-center gap-12 p-2">
  <section class="my-4 flex flex-col text-center">
    <h1 class="text-4xl font-bold">
      ¿Cuántos tweets likeó nuestro Presidente
      <select bind:value={filter}>
        <option value="last-24h">las últimas 24hs</option>
        <option value="today">hoy, {weekDayFormatter.format(new Date())}</option
        >
        {#each ultimaSemana.toReversed().slice(1) as { day }}
          <option value={`date:${day.format("YYYY-MM-DD")}`}
            >{weekDayFormatter.format(day.toDate())}</option
          >
        {/each}
      </select>
      ?
    </h1>
    <h2 class="text-9xl font-black">{filteredTweets.length}</h2>
    <small
      >última vez actualizado {dateFormatter.format(
        data.lastUpdated?.at,
      )}</small
    >
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
      start={startTimeFilter}
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
        >, registro los "me gusta" y genero un estimado de cuanto tiempo estuvo
        usando Twitter:
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
      <!-- <thead>
<tr>
  <th></th>
</tr>
      </thead> -->

      <tbody>
        {#each ultimaSemana as { day, tweets, retweets, screenTime }}
          <tr>
            <th class="px-1 text-right"
              >{weekDayFormatter.format(day.toDate())}</th
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
    </div>
  </footer>
</div>

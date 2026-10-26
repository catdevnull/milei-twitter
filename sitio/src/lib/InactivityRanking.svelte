<script lang="ts">
  import { tz } from "$lib/consts";

  export let streaks: { start: Date; end: Date; durationMs: number }[];

  const formatter = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });

  // Use elapsed days, rather than calendar durations, so long gaps never wrap at 24h.
  function formatDuration(ms: number) {
    const minutes = Math.floor(ms / 60_000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return (
      [
        days ? `${days} ${days === 1 ? "día" : "días"}` : "",
        hours ? `${hours} h` : "",
        minutes % 60 ? `${minutes % 60} min` : "",
      ]
        .filter(Boolean)
        .join(" ") || "Menos de 1 min"
    );
  }
</script>

<section
  class="mx-auto w-full max-w-2xl bg-neutral-100 p-4 dark:bg-neutral-800 md:rounded-lg"
  aria-labelledby="inactivity-heading"
>
  <h2
    id="inactivity-heading"
    class="mb-2 text-center text-xl font-bold md:text-3xl"
  >
    Sus rachas más largas sin actividad
  </h2>
  <p class="mb-4 text-center text-sm text-muted-foreground">
    Las 10 pausas más largas entre tweets, retweets o likes registrados desde el
    12 de febrero de 2024. Horarios de Argentina.
  </p>

  {#if streaks.length > 0}
    <ol class="divide-y divide-neutral-300 dark:divide-neutral-600">
      {#each streaks as streak, index}
        <li class="flex items-start gap-3 py-3">
          <span
            class="w-6 shrink-0 text-right font-bold tabular-nums"
            aria-hidden="true"
          >
            {index + 1}.
          </span>
          <div class="min-w-0">
            <p class="text-lg font-bold tabular-nums">
              {formatDuration(streak.durationMs)}
            </p>
            <p class="text-sm">
              Desde <time datetime={streak.start.toISOString()}
                >{formatter.format(streak.start)}</time
              >
              <br />
              hasta
              <time datetime={streak.end.toISOString()}
                >{formatter.format(streak.end)}</time
              >.
            </p>
          </div>
        </li>
      {/each}
    </ol>
  {:else}
    <p class="py-4 text-center text-sm">
      Todavía no hay suficientes actividades registradas para calcular las
      rachas.
    </p>
  {/if}

  <p class="mt-4 text-sm text-muted-foreground">
    No tener actividad registrada no significa que no haya usado Twitter. Puede
    haber faltantes en los datos. Los likes dejaron de ser públicos el 12 de
    junio de 2024. Solo se incluyen pausas que terminaron con otra actividad.
  </p>
</section>

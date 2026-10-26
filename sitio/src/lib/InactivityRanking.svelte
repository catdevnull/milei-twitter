<script lang="ts">
  import { tz } from "$lib/consts";

  export let streaks: { start: Date; end: Date; durationMs: number }[];

  let expanded = false;
  $: visibleStreaks = expanded ? streaks : streaks.slice(0, 5);
  $: maxDuration = Math.max(1, ...streaks.map((streak) => streak.durationMs));

  const formatter = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: tz,
  });
  const shortDate = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: tz,
  });

  // Use elapsed days so long gaps never wrap at 24h.
  function formatDuration(ms: number) {
    const minutes = Math.floor(ms / 60_000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    if (days) return `${days}d${hours ? `${hours}h` : ""}`;
    return (
      `${hours ? `${hours}h` : ""}${minutes % 60 ? `${minutes % 60}m` : ""}` ||
      "<1m"
    );
  }

  function describe(streak: (typeof streaks)[number]) {
    const minutes = Math.floor(streak.durationMs / 60_000);
    return `${Math.floor(minutes / 1440)} días, ${Math.floor((minutes % 1440) / 60)} horas y ${minutes % 60} minutos. Desde ${formatter.format(streak.start)} hasta ${formatter.format(streak.end)} (Argentina).`;
  }
</script>

<section
  class="mx-auto w-full max-w-2xl bg-neutral-100 p-4 dark:bg-neutral-800 md:rounded-lg"
  aria-labelledby="inactivity-heading"
>
  <div
    class="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
  >
    <h2 id="inactivity-heading" class="text-lg font-bold">
      Rachas sin actividad
    </h2>
    <p class="text-xs text-muted-foreground">
      Top 10 histórico · Hora argentina
    </p>
  </div>

  {#if streaks.length > 0}
    <ol id="inactivity-streaks" class="space-y-2">
      {#each visibleStreaks as streak}
        <li class="streak-row tabular-nums" title={describe(streak)}>
          <time
            class="whitespace-nowrap text-xs text-muted-foreground"
            datetime={streak.start.toISOString()}
            aria-hidden="true">{shortDate.format(streak.start)}</time
          >
          <span class="sr-only">{describe(streak)}</span>
          <div
            class="h-5 min-w-0 border-l border-neutral-300 dark:border-neutral-600"
            aria-hidden="true"
          >
            <div
              class="h-full rounded-r-sm bg-orange-400 dark:bg-orange-400"
              style:width={`${(streak.durationMs / maxDuration) * 100}%`}
            ></div>
          </div>
          <span class="text-right text-sm font-semibold" aria-hidden="true">
            {formatDuration(streak.durationMs)}
          </span>
        </li>
      {/each}
    </ol>
    {#if streaks.length > 5}
      <button
        type="button"
        class="mt-2 min-h-9 rounded px-2 text-xs font-medium underline underline-offset-4 hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-neutral-700"
        aria-expanded={expanded}
        aria-controls="inactivity-streaks"
        onclick={() => (expanded = !expanded)}
      >
        {expanded ? "Mostrar solo 5" : `Ver las ${streaks.length} rachas`}
      </button>
    {/if}
  {:else}
    <p class="py-2 text-sm text-muted-foreground">
      Todavía no hay suficientes actividades para calcular las rachas.
    </p>
  {/if}

  <details class="mt-1 text-xs text-muted-foreground">
    <summary
      class="w-fit cursor-pointer rounded py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      Cómo se calcula
    </summary>
    <p class="mt-1 leading-relaxed">
      Pausas entre tweets, retweets o likes registrados desde el 12 de febrero
      de 2024. Solo se incluyen pausas que terminaron con otra actividad. Las
      barras comparten escala desde cero. Las duraciones de un día o más se
      muestran en días y horas completas; el detalle exacto figura al pasar el
      cursor. Puede haber faltantes en los datos: no tener actividad registrada
      no significa que no haya usado Twitter. Los likes dejaron de ser públicos
      el 12 de junio de 2024.
    </p>
  </details>
</section>

<style>
  .streak-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) 4rem;
    align-items: center;
    column-gap: 0.75rem;
  }

  @media (max-width: 479px) {
    .streak-row {
      grid-template-columns: auto minmax(0, 1fr) 3.5rem;
      column-gap: 0.5rem;
    }
  }
</style>

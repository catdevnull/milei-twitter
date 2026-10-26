<script lang="ts">
  import { tz } from "$lib/consts";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import * as Popover from "$lib/components/ui/popover";
  import { CalendarIcon } from "lucide-svelte";

  export let streaks: { start: Date; end: Date; durationMs: number }[];
  export let period: {
    preset: string;
    from: string;
    to: string;
    today: string;
  };

  $: from = period.from;
  $: to = period.to;
  let filterError = "";
  let loading = false;
  let datesOpen = false;
  $: if (period) filterError = "";

  const presets = [
    { value: "all", label: "Todo", title: "Todo el historial" },
    { value: "5y", label: "5y", title: "Últimos 5 años" },
    { value: "1y", label: "1y", title: "Último año" },
    { value: "6m", label: "6m", title: "Últimos 6 meses" },
    { value: "3m", label: "3m", title: "Últimos 3 meses" },
    { value: "1m", label: "1m", title: "Último mes" },
  ];

  function filterUrl(preset?: string) {
    const url = new URL($page.url);
    for (const key of ["streakPeriod", "streakFrom", "streakTo"])
      url.searchParams.delete(key);
    if (preset) url.searchParams.set("streakPeriod", preset);
    else {
      url.searchParams.set("streakFrom", from);
      url.searchParams.set("streakTo", to);
    }
    return url.pathname + url.search;
  }

  async function applyDates(event: SubmitEvent) {
    event.preventDefault();
    filterError = "";
    if (from > to) {
      filterError = "La fecha de inicio debe ser anterior o igual a la de fin.";
      return;
    }
    loading = true;
    try {
      await goto(filterUrl(), { noScroll: true, keepFocus: true });
      datesOpen = false;
    } finally {
      loading = false;
    }
  }

  let expanded = false;
  $: if (streaks) expanded = false;
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
    month: "short",
    year: "2-digit",
    timeZone: tz,
  });

  function formatShortDate(date: Date) {
    return shortDate
      .formatToParts(date)
      .filter((part) => ["day", "month", "year"].includes(part.type))
      .map((part) => part.value.replace(/\.$/, ""))
      .join("/");
  }

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
    <p class="text-xs text-muted-foreground">Top 10 · Hora argentina</p>
  </div>

  <nav class="mb-4 flex items-center gap-0.5" aria-label="Período del ranking">
    {#each presets as preset}
      <a
        href={filterUrl(preset.value)}
        data-sveltekit-noscroll
        aria-label={preset.title}
        aria-current={period.preset === preset.value ? "true" : undefined}
        title={preset.title}
        class="range-preset flex min-h-8 items-center rounded px-2 py-1 text-xs font-medium hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-neutral-700"
        >{preset.label}</a
      >
    {/each}
    <Popover.Root bind:open={datesOpen}>
      <Popover.Trigger
        class="range-preset ml-auto flex min-h-8 shrink-0 items-center gap-1.5 rounded px-2 text-xs font-medium hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-neutral-700"
        data-selected={period.preset === "custom"}
        aria-label="Elegir rango de fechas"
        onclick={() => {
          from = period.from;
          to = period.to;
          filterError = "";
        }}
      >
        <CalendarIcon class="size-3.5" aria-hidden="true" />
        {#if period.preset === "custom"}
          <span class="hidden tabular-nums sm:inline"
            >{formatShortDate(new Date(period.from + "T12:00:00-03:00"))} – {formatShortDate(
              new Date(period.to + "T12:00:00-03:00"),
            )}</span
          >
          <span class="sm:hidden">Fechas</span>
        {:else}
          Fechas
        {/if}
      </Popover.Trigger>
      <Popover.Content
        align="end"
        class="w-80 max-w-[calc(100vw-2rem)]"
        aria-label="Filtrar rachas por fechas"
      >
        <h3 class="text-sm font-semibold">Elegir fechas</h3>
        <form class="mt-3 flex flex-wrap items-end gap-3" onsubmit={applyDates}>
          <label
            class="flex min-w-[7rem] flex-1 flex-col gap-1 text-xs text-muted-foreground"
          >
            Desde
            <input
              class="date-input"
              type="date"
              name="streakFrom"
              bind:value={from}
              max={period.today}
              required
              aria-describedby={filterError ? "streak-filter-error" : undefined}
              aria-invalid={filterError ? "true" : undefined}
            />
          </label>
          <label
            class="flex min-w-[7rem] flex-1 flex-col gap-1 text-xs text-muted-foreground"
          >
            Hasta
            <input
              class="date-input"
              type="date"
              name="streakTo"
              bind:value={to}
              max={period.today}
              required
              aria-describedby={filterError ? "streak-filter-error" : undefined}
              aria-invalid={filterError ? "true" : undefined}
            />
          </label>
          <button
            class="min-h-9 rounded border border-neutral-300 px-3 text-xs font-medium hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 dark:border-neutral-600 dark:hover:bg-neutral-700"
            type="submit"
            disabled={loading}
          >
            {loading ? "Filtrando…" : "Aplicar"}
          </button>
          {#if filterError}
            <p
              id="streak-filter-error"
              role="alert"
              class="w-full text-xs text-red-700 dark:text-red-300"
            >
              {filterError}
            </p>
          {/if}
        </form>
      </Popover.Content>
    </Popover.Root>
  </nav>

  {#if streaks.length > 0}
    <ol id="inactivity-streaks" class="space-y-2">
      {#each visibleStreaks as streak}
        <li class="streak-row tabular-nums" title={describe(streak)}>
          <time
            class="whitespace-nowrap text-xs text-muted-foreground"
            datetime={streak.start.toISOString()}
            aria-hidden="true">{formatShortDate(streak.start)}</time
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
      No hay suficientes actividades en este período. Probá ampliar el rango.
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
      de 2024. Solo se incluyen pausas cuyo inicio y fin están dentro del rango
      elegido. Las fechas incluyen el día completo en horario argentino. Las
      barras comparten escala desde cero. Las duraciones de un día o más se
      muestran en días y horas completas; el detalle exacto figura al pasar el
      cursor. Puede haber faltantes en los datos: no tener actividad registrada
      no significa que no haya usado Twitter. Los likes dejaron de ser públicos
      el 12 de junio de 2024.
    </p>
  </details>
</section>

<style>
  .range-preset[aria-current="true"],
  :global(.range-preset[data-selected="true"]) {
    background: hsl(var(--foreground));
    color: hsl(var(--background));
    box-shadow: inset 0 -2px 0 currentColor;
  }

  .date-input {
    min-height: 2.25rem;
    width: 100%;
    min-width: 0;
    border: 1px solid rgb(163 163 163);
    border-radius: 0.25rem;
    background: transparent;
    padding: 0.25rem 0.5rem;
    color: inherit;
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
  }

  .date-input:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

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

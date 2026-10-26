<script lang="ts">
  import { afterUpdate, onMount } from "svelte";
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
  } from "chart.js";
  import type { WeeklyInactivity } from "$lib/queries/inactivity";
  import { dayjs, tz } from "$lib/consts";

  Chart.register(
    LineController,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
  );

  export let weeks: WeeklyInactivity[];
  let metric: "meanMs" | "medianMs" = "meanMs";
  let canvas: HTMLCanvasElement;
  let chart: Chart<"line", (number | null)[]> | undefined;
  $: hasData = weeks.some((week) => week.count > 0);

  function formatDuration(ms: number | null) {
    if (ms === null) return "Sin datos";
    if (ms === 0) return "0m";
    if (ms < 60_000) return "<1m";
    const minutes = Math.round(ms / 60_000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return [
      days ? `${days}d` : "",
      hours ? `${hours}h` : "",
      minutes % 60 ? `${minutes % 60}m` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  const weekDate = (week: string) => dayjs.tz(week, tz).format("DD/MM/YY");

  function updateChart() {
    if (!canvas || !hasData) {
      chart?.destroy();
      chart = undefined;
      return;
    }
    const values = weeks.map((week) =>
      week[metric] === null ? null : week[metric]! / 3_600_000,
    );
    const peak = values.reduce<number>(
      (max, value) =>
        value !== null && Number.isFinite(value) ? Math.max(max, value) : max,
      0,
    );
    // Recompute bounds from the current filter and metric, including headroom
    // for markers at the peak. Never reuse a previous range's upper bound.
    const paddedPeak = Math.max(peak * 1.1, 1 / 60);
    const step = 10 ** Math.floor(Math.log10(paddedPeak)) / 2;
    const yMax = Math.ceil(paddedPeak / step) * step;
    const data = {
      labels: weeks.map((week) => weekDate(week.week)),
      datasets: [
        {
          label: metric === "meanMs" ? "Promedio" : "Mediana",
          data: values,
          borderColor: "#f97316",
          backgroundColor: "#f97316",
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointStyle: weeks.map((week) =>
            week.partial ? ("triangle" as const) : ("circle" as const),
          ),
          spanGaps: false,
          tension: 0,
        },
      ],
    };
    if (chart) {
      chart.data = data;
      chart.options.scales!.y!.min = 0;
      chart.options.scales!.y!.max = yMax;
      chart.update("none");
      return;
    }
    chart = new Chart(canvas, {
      type: "line",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          // The existing activity chart registers this plugin globally.
          datalabels: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const week = weeks[items[0].dataIndex];
                return `Semana del ${weekDate(week.week)}${week.partial ? " (parcial)" : ""}`;
              },
              label: (item) =>
                `${metric === "meanMs" ? "Promedio" : "Mediana"}: ${formatDuration(weeks[item.dataIndex][metric])}`,
              afterLabel: (item) =>
                `${weeks[item.dataIndex].count} rachas registradas`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxTicksLimit: 7,
              maxRotation: 0,
              color: "#737373",
              font: { size: 10 },
            },
          },
          y: {
            beginAtZero: true,
            min: 0,
            max: yMax,
            grid: { color: "rgba(163,163,163,0.2)" },
            ticks: {
              maxTicksLimit: 4,
              color: "#737373",
              font: { size: 10 },
              callback: (value) => {
                const hours = Number(value);
                return hours === 0
                  ? "0"
                  : hours < 1
                    ? `${+(hours * 60).toFixed(1)}m`
                    : `${+hours.toFixed(1)}h`;
              },
            },
          },
        },
      },
    });
  }

  onMount(() => {
    updateChart();
    return () => chart?.destroy();
  });
  afterUpdate(updateChart);
</script>

<div class="mb-5 border-b border-neutral-200 pb-3 dark:border-neutral-700">
  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
    <h3 class="text-sm font-semibold">Duración semanal de las pausas</h3>
    <div class="flex gap-1" role="group" aria-label="Medida semanal">
      <button
        type="button"
        aria-pressed={metric === "meanMs"}
        class="metric-button"
        onclick={() => (metric = "meanMs")}>Promedio</button
      >
      <button
        type="button"
        aria-pressed={metric === "medianMs"}
        class="metric-button"
        onclick={() => (metric = "medianMs")}>Mediana</button
      >
    </div>
  </div>
  {#if hasData}
    <div
      class="relative h-44"
      role="img"
      aria-label={`${metric === "meanMs" ? "Promedio" : "Mediana"} semanal de la duración de las rachas de inactividad. Los valores y cantidades se encuentran en Ver datos semanales.`}
    >
      <canvas bind:this={canvas} aria-hidden="true"></canvas>
    </div>
    <p class="mt-1 text-xs text-muted-foreground">
      Semana de inicio · Triángulo: semana parcial · Hueco: sin datos
    </p>
  {:else}
    <p class="py-4 text-sm text-muted-foreground">
      No hay suficientes actividades para calcular la evolución semanal en este
      período.
    </p>
  {/if}
  <details class="mt-2 text-xs text-muted-foreground">
    <summary
      class="w-fit cursor-pointer rounded py-1 focus-visible:outline focus-visible:outline-2"
      >Ver datos semanales</summary
    >
    <p class="my-2 leading-relaxed">
      El promedio refleja las pausas largas; la mediana muestra la pausa típica.
      Cada racha se asigna a la semana de su inicio, de lunes a domingo en
      Argentina. Incluye todas las rachas del filtro, no solo las del ranking.
      Las semanas con pocas rachas son menos representativas. No mide el tiempo
      total desconectado.
    </p>
    {#if hasData}
      <div class="max-h-48 overflow-auto">
        <table class="w-full text-left tabular-nums">
          <caption class="sr-only"
            >Duración de las pausas por semana y cantidad de rachas</caption
          >
          <thead
            ><tr
              ><th scope="col" class="py-1">Semana</th><th scope="col"
                >Promedio</th
              ><th scope="col">Mediana</th><th scope="col" class="text-right"
                >Rachas</th
              ></tr
            ></thead
          >
          <tbody
            >{#each weeks as week}<tr
                ><th scope="row" class="py-1 font-normal"
                  >{weekDate(week.week)}{week.partial ? " (parcial)" : ""}</th
                ><td>{formatDuration(week.meanMs)}</td><td
                  >{formatDuration(week.medianMs)}</td
                ><td class="text-right">{week.count}</td></tr
              >{/each}</tbody
          >
        </table>
      </div>
    {/if}
  </details>
</div>

<style>
  .metric-button {
    min-height: 2rem;
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
  .metric-button[aria-pressed="true"] {
    background: hsl(var(--foreground));
    color: hsl(var(--background));
  }
  .metric-button:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
</style>

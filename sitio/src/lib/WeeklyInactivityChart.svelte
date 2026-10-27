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
      week.maxMs === null ? null : week.maxMs! / 3_600_000,
    );
    const peak = values.reduce<number>(
      (max, value) =>
        value !== null && Number.isFinite(value) ? Math.max(max, value) : max,
      0,
    );
    // Recompute bounds from the current filter, including headroom
    // for markers at the peak. Never reuse a previous range's upper bound.
    const paddedPeak = Math.max(peak * 1.1, 1 / 60);
    const step = 10 ** Math.floor(Math.log10(paddedPeak)) / 2;
    const yMax = Math.ceil(paddedPeak / step) * step;
    const data = {
      labels: weeks.map((week) => weekDate(week.week)),
      datasets: [
        {
          label: "Máximo",
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
                `Máximo: ${formatDuration(weeks[item.dataIndex].maxMs)}`,
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
  <h3 class="mb-2 text-sm font-semibold">Pausa más larga de cada semana</h3>
  {#if hasData}
    <div
      class="relative h-44"
      role="img"
      aria-label="Máximo semanal de la duración de las rachas de inactividad."
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
  {#if hasData}
    <div class="sr-only">
      <table class="w-full text-left tabular-nums">
        <caption class="sr-only"
          >Duración de las pausas por semana y cantidad de rachas</caption
        >
        <thead
          ><tr
            ><th scope="col" class="py-1">Semana</th><th scope="col">Máximo</th
            ><th scope="col" class="text-right">Rachas</th></tr
          ></thead
        >
        <tbody
          >{#each weeks as week}<tr
              ><th scope="row" class="py-1 font-normal"
                >{weekDate(week.week)}{week.partial ? " (parcial)" : ""}</th
              ><td>{formatDuration(week.maxMs)}</td><td class="text-right"
                >{week.count}</td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div>
  {/if}
</div>

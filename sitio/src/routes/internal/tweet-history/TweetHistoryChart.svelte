<script lang="ts">
  import { Chart, registerables } from "chart.js";
  import { afterUpdate, onMount } from "svelte";

  export let history: Array<{
    scrapedAt: Date;
    favoriteCount: number;
    viewsCount: number | null;
  }>;

  Chart.register(...registerables);

  let canvas: HTMLCanvasElement;
  let chart: Chart<"line">;

  function chartData() {
    return {
      labels: history.map((point) =>
        new Date(point.scrapedAt).toLocaleString(),
      ),
      datasets: [
        {
          label: "Likes",
          data: history.map((point) => point.favoriteCount),
          borderColor: "#2563eb",
          backgroundColor: "#2563eb",
          yAxisID: "likes",
          tension: 0.2,
        },
        {
          label: "Views",
          data: history.map((point) => point.viewsCount),
          borderColor: "#dc2626",
          backgroundColor: "#dc2626",
          yAxisID: "views",
          tension: 0.2,
        },
      ],
    };
  }

  onMount(() => {
    chart = new Chart(canvas, {
      type: "line",
      data: chartData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          likes: { type: "linear", position: "left", beginAtZero: true },
          views: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
    return () => chart.destroy();
  });

  afterUpdate(() => {
    if (!chart) return;
    chart.data = chartData();
    chart.update();
  });
</script>

<div class="h-[360px]">
  <canvas bind:this={canvas}></canvas>
</div>

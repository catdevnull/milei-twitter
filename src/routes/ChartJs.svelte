<script lang="ts">
  import {
    Chart,
    LineController,
    type ChartData,
    type ChartOptions,
    type ChartType,
    type Point,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    TimeScale,
    Tooltip,
    Legend,
    BarController,
    BarElement,
  } from "chart.js";
  import "chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm";
  import { onMount } from "svelte";

  Chart.register(
    LineController,
    LineElement,
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    TimeScale,
    PointElement,
    Filler,
    Tooltip,
    Legend,
  );

  export let type: ChartType;
  export let data: ChartData<typeof type, { x: number; y: number }[]>;
  export let options: ChartOptions<typeof type> = {};

  let canvasEl: HTMLCanvasElement;
  onMount(() => {
    const chart = new Chart(canvasEl, {
      type,
      data,
      options,
    });
    return () => chart.destroy();
  });
</script>

<canvas bind:this={canvasEl} />

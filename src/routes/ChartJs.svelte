<script lang="ts">
  import {
    Chart,
    type ChartData,
    type ChartOptions,
    type ChartType,
    CategoryScale,
    LinearScale,
    PointElement,
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

<canvas class="h-[200px] md:h-[300px]" bind:this={canvasEl} />

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
  import { char } from "drizzle-orm/mysql-core";
  import { afterUpdate, onMount } from "svelte";

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
  let chart: Chart;

  onMount(() => {
    chart = new Chart(canvasEl, {
      type,
      data,
      options,
    });
    return () => chart.destroy();
  });

  // https://github.com/SauravKanchan/svelte-chartjs/blob/master/src/Chart.svelte
  afterUpdate(() => {
    if (!chart) return;

    chart.data = data;
    Object.assign(chart.options, options);
    chart.update();
  });
</script>

<canvas class="h-[200px] md:h-[300px]" bind:this={canvasEl} />

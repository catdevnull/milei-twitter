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
  import ChartDataLabels from "chartjs-plugin-datalabels";

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

    ChartDataLabels,
  );

  export let type: ChartType;
  type DataPoint = { x: string | number; y: number };
  export let data: ChartData<typeof type, Array<DataPoint>>;
  export let options: ChartOptions<typeof type> = {};

  let canvasEl: HTMLCanvasElement;
  let chart: Chart<typeof type, Array<DataPoint>>;

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

<canvas class="h-[250px] md:h-[300px]" bind:this={canvasEl} />

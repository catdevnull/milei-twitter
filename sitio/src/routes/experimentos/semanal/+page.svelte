<script lang="ts">
  import type { PageData } from "../../$types";
  import {
    calculateScreenTime,
    formatDurationFromMs,
    formatTinyDurationFromMs,
    totalFromDurations,
  } from "$lib/data-processing/screenTime";
  import { goto } from "$app/navigation";
  import { dayjs } from "$lib/consts";
  import "core-js/es/array/to-reversed";
  import Semana from "../../Semana.svelte";
  import { page } from '$app/stores';

  const tz = "America/Argentina/Buenos_Aires";

  export let data: PageData;

  $: ultimaSemana = data.ultimaSemana;

  function setQuery(query: string) {
    goto(`?q=${query}`);
  }


  const retroSemana = () => {
    const query =
      $page.url.searchParams.get("q") ?? "date:" + dayjs().tz(tz).format("YYYY-MM-DD");
    const startingFrom = dayjs(query.slice(5), "YYYY-MM-DD").tz(tz, true);
    setQuery(`date:${dayjs(startingFrom.subtract(7, 'days')).format("YYYY-MM-DD")}`);
  }

  const proxSemana = () => {
    const query =
      $page.url.searchParams.get("q") ?? "date:" + dayjs().tz(tz).format("YYYY-MM-DD");
    const startingFrom = dayjs(query.slice(5), "YYYY-MM-DD").tz(tz, true);
    setQuery(`date:${dayjs(startingFrom.add(7, 'days')).format("YYYY-MM-DD")}`);
  }

  /*
  const dowLabels = ["D", "L", "M", "X", "J", "V", "S"];
  const monthLabels = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const onDayClick = (evt: any) =>
    setQuery(`date:${dayjs(evt.startDate).format("YYYY-MM-DD")}`);
  */
</script>
<div
  class="flex min-h-screen flex-col justify-center gap-12 p-2"
>
  <section class="mx-auto flex max-w-2xl flex-col">
    <h2 class="text-center text-2xl font-bold">
      <button on:click={retroSemana}>{'<<'}</button>
        Semanal
      <button on:click={proxSemana}>{'>>'}</button>
    </h2>
    <Semana
      ultimaSemana={ultimaSemana}
    />

  </section>

</div>

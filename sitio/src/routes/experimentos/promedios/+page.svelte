<script lang="ts">
  import { dayjs, likesCutoff, longDateFormatter } from "$lib/consts";
  import { getDaysInTimePeriod } from "$lib/data-processing/days";
  import { formatTinyDurationFromMs } from "$lib/data-processing/screenTime";
  import AlertInfo from "../../admin/AlertInfo.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  const timeFormatter = Intl.DateTimeFormat("es-AR", {
    timeStyle: "medium",
    timeZone: "America/Argentina/Buenos_Aires",
  });
</script>

<main class="mx-auto flex min-h-screen max-w-2xl flex-col gap-12 p-2">
  <AlertInfo>
    <svelte:fragment slot="title">Likes no disponibles</svelte:fragment>
    Desde {longDateFormatter.format(likesCutoff?.cutAt)}, ya no podemos mostrar
    los 'me gusta' de Milei en Twitter/X porque ahora son privados.
    <a class="link" href="https://x.com/wanghaofei/status/1793096366132195529"
      >Más información</a
    >. En esta página, ahora se muestran los retweets. (Seguimos teniendo la
    base de datos con likes antes del corte,
    <a class="link" href="/info/faq">contactame</a> si querés accederla.)
  </AlertInfo>

  <h1 class="text-3xl font-black">Últimos 1000 retweets de @JMilei</h1>

  <ul class="flex flex-col divide-y divide-neutral-300">
    {#each data.january as day}
      <li class="break-words py-1 leading-tight">
        <strong class="font-semibold">{day.day}</strong>:
        <span class="text-neutral-500"
          >{formatTinyDurationFromMs(day.screenTime)}</span
        >
      </li>
    {/each}
  </ul>
</main>

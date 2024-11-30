<script lang="ts">
  import { dayjs, likesCutoff, monthFormatter, tz } from "$lib/consts";
  import AlertInfo from "$lib/components/AlertInfo.svelte";
  import type { PageData } from "./$types";
  import Meta from "$lib/components/Meta.svelte";
  import StatsCalendar from "@/StatsCalendar.svelte";
  import { processDataForDays } from "@/data-processing/days";
  import StatsCalendarNavigation from "@/StatsCalendarNavigation.svelte";

  export let data: PageData;

  $: monthString = monthFormatter.format(data.start);

  let avgString: ReturnType<typeof processDataForDays>["avgString"];
  $: ({ avgString } = processDataForDays(data.monthData));
</script>

<Meta
  keywords={true}
  title={`¿Cuanto tiempo pasó Milei en Twitter en ${monthString}?`}
  description={`Descubrí cuanto tiempo pasó el presidente Javier Milei en Twitter durante ${monthString}.`}
/>

<main class="mx-auto flex min-h-screen max-w-2xl flex-col gap-12 py-4">
  <section class="mx-auto w-full max-w-2xl p-4">
    <h1 class="mb-4 text-5xl font-black leading-[1.1em]">
      Milei pasó un promedio de
      <span class="text-red-600 dark:text-red-500">{avgString}</span>
      diarios en Twitter durante {monthString}.
    </h1>
    <StatsCalendarNavigation
      start={data.start}
      hasNextMonth={data.hasNextMonth}
    />
  </section>

  <section class="mx-auto w-full max-w-2xl">
    <StatsCalendar monthData={data.monthData} start={data.start} />
  </section>

  {#if data.end > likesCutoff.cutAt}
    <div class="px-4">
      <AlertInfo>
        <svelte:fragment slot="title">Likes no disponibles</svelte:fragment>
        A partir del 12 de junio de 2024, la cantidad de "me gusta" en los tweets
        de Milei en Twitter/X ya no está disponible públicamente. Esto significa
        que nuestro cálculo del tiempo estimado se basa únicamente en la cantidad
        de retweets, lo que podría resultar en una subestimación del tiempo real.
      </AlertInfo>
    </div>
  {/if}

  <section class="mx-auto w-full max-w-2xl text-center text-xl">
    <a href="/" class="text-blue-700 underline dark:text-blue-200"
      >milei.nulo.lol</a
    >
  </section>
</main>

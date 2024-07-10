<script lang="ts">
  import { likesCutoff, longDateFormatter } from "$lib/consts";
  import AlertInfo from "$lib/components/AlertInfo.svelte";
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
    {#each data.retweets as retweet}
      <li class="break-words py-1 leading-tight">
        <strong class="font-semibold">@{retweet.posterHandle}</strong>:
        <a
          href={`https://x.com/${retweet.posterHandle}/status/${retweet.postId}`}
          rel="noopener"
          target="_blank">{retweet.text}</a
        >
        <span class="text-neutral-500"
          >(retweeteado a las {timeFormatter.format(retweet.retweetAt)})</span
        >
      </li>
    {/each}
  </ul>
</main>

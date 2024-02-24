<script lang="ts">
  import { getUsernameFromUrl } from "$lib/data-processing/mostLiked";
  import type { PageData } from "./$types";

  export let data: PageData;

  const timeFormatter = Intl.DateTimeFormat("es-AR", {
    timeStyle: "medium",
    timeZone: "America/Argentina/Buenos_Aires",
  });
</script>

<main class="mx-auto flex min-h-screen max-w-2xl flex-col gap-12 p-2">
  <div
    class="[&>svg]:text-foreground relative w-full rounded-lg border border-transparent bg-yellow-500 p-4 text-white [&:has(svg)]:pl-11 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4"
  >
    <svg
      class="size-6 -translate-y-0.5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      ><path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      /></svg
    >
    <h5 class="mb-1 font-medium leading-none tracking-tight">¡Ey!</h5>
    <div class="text-sm opacity-80">
      Esta página es un experimento, y puede ser particularmente imprecisa o en
      general ser una bosta.
    </div>
  </div>

  <h1 class="text-3xl font-black">Últimos 200 likes de @JMilei</h1>

  <ul class="flex flex-col divide-y divide-neutral-300">
    {#each data.tweets as tweet}
      <li class="break-words py-1 leading-tight">
        <strong class="font-semibold">@{getUsernameFromUrl(tweet.url)}</strong>:
        <a href={tweet.url} rel="noopener" target="_blank">{tweet.text}</a>
        <span class="text-neutral-500"
          >(likeado aprox. {timeFormatter.format(tweet.firstSeenAt)})</span
        >
      </li>
    {/each}
  </ul>
</main>

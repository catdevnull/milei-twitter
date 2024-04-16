<script lang="ts">
  import { sortMost } from "$lib/data-processing/mostLiked";
  import Template from "../Template.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  $: allTweets = data.ultimaSemana.flatMap((s) => s.tweets);
  $: mostLiked = sortMost(allTweets);
</script>

<Template>
  <svelte:fragment slot="title">Los más likeados de la semana</svelte:fragment>
  <ol
    slot="content"
    class="mx-auto list-decimal columns-2 gap-x-32 p-8 pl-[2em] text-[2.75rem]"
  >
    {#each mostLiked as [handle, n]}
      <li class="py-4">@{handle} ({n}❤️)</li>
    {/each}
  </ol>
</Template>

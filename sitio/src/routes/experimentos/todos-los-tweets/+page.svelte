<script lang="ts">
  import { likesCutoff, longDateFormatter } from "$lib/consts";
  import AlertInfo from "$lib/components/AlertInfo.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  let searchQuery = "";
  let searchResults: typeof data.retweets = [];
  let isSearching = false;
  let hasSearched = false;
  let searchTimeout: ReturnType<typeof setTimeout>;

  const dateTimeFormatter = Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  async function handleSearch() {
    const query = searchQuery.trim();
    if (query.length < 2) {
      searchResults = [];
      hasSearched = false;
      return;
    }

    isSearching = true;
    try {
      const res = await fetch(
        `/api/search/retweets?q=${encodeURIComponent(query)}`,
      );
      const json = await res.json();
      // Parse date strings back to Date objects
      searchResults = (json.results ?? []).map((r: any) => ({
        ...r,
        retweetAt: new Date(r.retweetAt),
      }));
      hasSearched = true;
    } catch (e) {
      console.error("Search failed:", e);
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }

  function onInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(handleSearch, 300);
  }

  function clearSearch() {
    searchQuery = "";
    searchResults = [];
    hasSearched = false;
  }

  $: displayRetweets = hasSearched ? searchResults : data.retweets;
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

  <div class="relative">
    <input
      type="search"
      bind:value={searchQuery}
      on:input={onInput}
      placeholder="Buscar en retweets..."
      class="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 pr-10 text-base shadow-sm transition-colors placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
    />
    {#if searchQuery}
      <button
        on:click={clearSearch}
        class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
        aria-label="Limpiar búsqueda"
      >
        ✕
      </button>
    {/if}
  </div>

  {#if isSearching}
    <p class="text-neutral-500">Buscando...</p>
  {:else if hasSearched}
    <p class="text-sm text-neutral-500">
      {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""} para
      "{searchQuery}"
      {#if searchResults.length === 25}
        <span class="text-neutral-400">(máximo 25)</span>
      {/if}
    </p>
  {/if}

  <ul class="flex flex-col divide-y divide-neutral-300">
    {#each displayRetweets as retweet}
      <li class="break-words py-1 leading-tight">
        <strong class="font-semibold">@{retweet.posterHandle}</strong>:
        <a
          href={`https://x.com/${retweet.posterHandle}/status/${retweet.postId}`}
          rel="noopener"
          target="_blank">{retweet.text}</a
        >
        <span class="text-neutral-500"
          >({dateTimeFormatter.format(retweet.retweetAt)})</span
        >
      </li>
    {/each}
  </ul>
</main>

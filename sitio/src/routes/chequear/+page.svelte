<script lang="ts">
  import { page } from "$app/stores";
  import ButtonPrimary from "$lib/components/ButtonPrimary.svelte";
  import ErrorBox from "$lib/components/ErrorBox.svelte";
  import Input from "$lib/components/Input.svelte";
  import { dayjs } from "$lib/consts";
  import Footer from "../Footer.svelte";
  import type { PageServerData } from "./$types";

  export let data: PageServerData;
  $: query = $page.url.searchParams.get("url");

  $: fecha = data.found
    ? dayjs(data.found.firstSeenAt + "").format("YYYY-MM-DD hh:mm")
    : "";
  $: chequeoIntentado = "found" in data;
</script>

<div class="m-auto flex max-w-2xl flex-col justify-center">
  <form data-sveltekit-reload class="mb-4 p-8">
    <h1 class="my-8 text-4xl font-black">Chequeador de likes de @JMilei</h1>
    <div class="my-2">
      <label class="mb-2 block text-sm font-bold" for="username">
        URL del tweet
      </label>
      <Input
        type="text"
        name="url"
        value={query}
        placeholder="https://twitter.com/@usuario/status/@idDelTwit"
      />
    </div>
    {#if data.error}
      <div class="my-2 w-full">
        <ErrorBox>
          {data.error}
        </ErrorBox>
      </div>
    {/if}
    <div class="flex flex-wrap items-center justify-between">
      <ButtonPrimary>Chequear</ButtonPrimary>
    </div>

    {#if chequeoIntentado}
      <div
        class={`mt-4 w-full border-2 border-dashed p-4 text-center ${data.found ? "border-green-500" : "border-red-500"}`}
      >
        {#if data.found}
          <span class="font-bold text-green-500"
            >✓ Sí, fue likeado el <a
              class="text-blue-500 underline"
              href={`/?q=date:${dayjs(data.found.firstSeenAt).format("YYYY-MM-DD")}`}
              >{fecha}</a
            ></span
          >
        {:else}
          <span class="font-bold text-red-500">No fue likeado por Milei ❌</span
          >
        {/if}
      </div>
    {/if}
    <div class="my-2 w-full">
      Los datos disponibles son posteriores al 10 de febrero. <br /> Esta herramienta
      es experimental y podría dar resultados erróneos.
    </div>
  </form>

  <Footer />
</div>

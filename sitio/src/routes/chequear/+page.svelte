<script lang="ts">
  import { page } from "$app/stores";
  import { dayjs } from "$lib/consts";
  import { likedTweets } from "../../schema";
  import Footer from "../Footer.svelte";
  import { goto } from "$app/navigation";

  export let data: { found: typeof likedTweets; error: string | null };
  $: test = $page.url.searchParams.get("test");

  $: fecha = data.found
    ? dayjs(data.found.firstSeenAt + "").format("YYYY-MM-DD hh:mm")
    : "";
  $: sinChequear = data.found === null; // si no vino info está para chequear

  const limpiarRespuesta = () => {
    sinChequear = true;
  };

  const onDayClick = () => {
    goto();
  };
</script>

<div class="m-auto flex max-w-2xl flex-col justify-center">
  <form data-sveltekit-reload class="mb-4 px-8 pb-8 pt-6">
    <div class="mb-4">
      <label class="mb-2 block text-sm font-bold" for="username">
        URL del tweet
      </label>
      <input
        on:keyup={limpiarRespuesta}
        class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight shadow focus:outline-none"
        type="text"
        name="test"
        value={test}
        placeholder="https://twitter.com/@usuario/status/@idDelTwit"
      />
    </div>
    <div class="flex flex-wrap items-center justify-between">
      <button
        class="focus:shadow-outline w-full rounded bg-blue-500 px-4 py-2 font-bold text-white focus:outline-none disabled:bg-blue-300 sm:w-3/6"
        disabled={!sinChequear}
      >
        {#if sinChequear}
          Chequear
        {:else}
          Chequeado
        {/if}
      </button>
      {#if !sinChequear}
        <div
          class={`mt-4 w-full border-2 border-dashed p-4 text-center ${data.found ? "border-green-500" : "border-red-500"}`}
        >
          {#if data.found}
            <span class="font-bold text-green-500"
              >✓ Sí, fue likeado el <a
                class="text-blue-500 underline"
                href={`/?q=date:${dayjs(data.found.firstSeenAt + "").format("YYYY-MM-DD")}`}
                >{fecha}</a
              ></span
            >
          {:else}
            <span class="font-bold text-red-500"
              >No fue likeado por Milei ❌</span
            >
          {/if}
        </div>
      {/if}
      {#if data.error}
        <div class="mt-2 w-full font-bold text-red-500">
          {data.error}
        </div>
      {/if}
    </div>
    <div class="mt-5 w-full">
      Los datos disponibles son posteriores al 10 de febrero. <br /> Esta herramienta
      es experimental y podría dar resultados erróneos.
    </div>
  </form>

  <Footer />
</div>

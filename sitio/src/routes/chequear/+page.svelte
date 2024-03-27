<script lang="ts">
  import { page } from '$app/stores';
  import { dayjs } from "$lib/consts";
  import { likedTweets } from "../../schema";
  import Footer from "../Footer.svelte"
  import { goto } from "$app/navigation";

  export let data: { found: typeof likedTweets, error: string | null };
  $: test = $page.url.searchParams.get("test");

  $: fecha = data.found ? dayjs(data.found.firstSeenAt + "").format("YYYY-MM-DD hh:mm") : ""
  $: sinChequear = data.found === null // si no vino info está para chequear

  const limpiarRespuesta = () => {
    sinChequear = true
  }

  const onDayClick = () => {
    goto();
  }
</script>
<div
  class="flex flex-col justify-center max-w-2xl m-auto"
>
  <form data-sveltekit-reload class="px-8 pt-6 pb-8 mb-4">
    <div class="mb-4">
      <label class="block text-sm font-bold mb-2" for="username">
        URL del tweet
      </label>
      <input on:keyup={limpiarRespuesta} class="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline" type="text" name="test" value={test} placeholder="https://twitter.com/@usuario/status/@idDelTwit">
    </div>
    <div class="flex items-center justify-between flex-wrap">
      <button class="bg-blue-500 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline sm:w-3/6 w-full" disabled={!sinChequear}>
        {#if sinChequear}
          Chequear
        {:else}
          Chequeado
        {/if}
      </button>
      {#if !sinChequear}
      <div class={`w-full mt-4 text-center border-dashed border-2 p-4 ${data.found?'border-green-500':'border-red-500'}`}>
          {#if data.found}
            <span class="text-green-500 font-bold">✓ Sí, fue likeado el <a class="underline text-blue-500" href={`/?q=date:${dayjs(data.found.firstSeenAt + "").format("YYYY-MM-DD")}`}>{fecha}</a></span>
          {:else}
            <span class="text-red-500 font-bold">No fue likeado por Milei ❌</span>
          {/if}
      </div>
      {/if}
      {#if data.error}
        <div class="w-full text-red-500 font-bold mt-2">
          {data.error}
        </div>
      {/if}
    </div>
    <div class="w-full mt-5">
      Los datos disponibles son posteriores al 10 de febrero. <br/> Esta herramienta es experimental y podría dar resultados erróneos.
    </div>
  </form>

  <Footer />
</div>

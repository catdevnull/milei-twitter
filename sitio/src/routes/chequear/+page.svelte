<script lang="ts">
  import { page } from '$app/stores';
  import { dayjs } from "$lib/consts";
  import { likedTweets } from "../../schema";
  import Footer from "../Footer.svelte"

  export let data: { found: typeof likedTweets, error: string | null };
  $: test = $page.url.searchParams.get("test");

  $: fecha = data.found ? dayjs(data.found.firstSeenAt + "").format("YYYY-MM-DD") : ""
  $: sinChequear = data.found === null // si no vino info está para chequear

  const limpiarRespuesta = () => {
    sinChequear = true
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
      <div class="w-full sm:w-3/6 mt-2 text-center">
        {#if !sinChequear}
          {#if data.found}
            ✓ Sí, fue likeado el {fecha}
          {:else}
            No fue likeado por Milei ❌
          {/if}
        {/if}
      </div>
      {#if data.error}
        <div class="w-full text-red-500 font-bold mt-2">
          {data.error}
        </div>
      {/if}
    </div>
  </form>

  <Footer />
</div>

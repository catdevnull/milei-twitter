<script lang="ts">
  import { page } from "$app/stores";
  import ButtonPrimary from "$lib/components/ButtonPrimary.svelte";
  import ErrorBox from "$lib/components/ErrorBox.svelte";
  import InfoBox from "$lib/components/InfoBox.svelte";
  import WarnBox from "$lib/components/WarnBox.svelte";
  import Input from "$lib/components/Input.svelte";
  import Prose from "$lib/components/Prose.svelte";
  import { dateFormatter, dayjs, timeFormatter } from "$lib/consts";
  import Footer from "../Footer.svelte";
  import type { PageServerData } from "./$types";

  export let data: PageServerData;
  $: query = $page.url.searchParams.get("url");
  $: chequeoIntentado = "found" in data;
</script>

<div class="m-auto flex max-w-2xl flex-col justify-center">
  <form class="px-4 py-6">
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
          <svelte:fragment slot="title">{data.error}</svelte:fragment>
        </ErrorBox>
      </div>
    {/if}
    <div class="my-2 flex flex-col content-center items-center justify-between">
      <ButtonPrimary>Chequear</ButtonPrimary>
    </div>

    {#if chequeoIntentado}
      {#if data.found}
        <div class="my-2">
          <InfoBox>
            <svelte:fragment slot="title"
              >Habría sido likeado por Milei el {#if data.linkToDate}<a
                  class="text-blue-200 underline"
                  href={`/?q=date:${dayjs(data.found.aproxLikedAt).format("YYYY-MM-DD")}`}
                  >{dateFormatter.format(data.found.aproxLikedAt)}</a
                >{:else}{dateFormatter.format(data.found.aproxLikedAt)}{/if}
              aproximadamente a las {timeFormatter.format(
                data.found.aproxLikedAt,
              )}.</svelte:fragment
            >
          </InfoBox>
        </div>
        {#if data.parsedFound.username && data.parsedQuery.username && data.parsedFound.username.toLowerCase() !== data.parsedQuery.username.toLowerCase()}
          <div class="my-2">
            <WarnBox>
              <svelte:fragment slot="title"
                >¿El usuario del post cambió su nombre de usuario?</svelte:fragment
              >
              El tweet del like registrado en nuestra base de datos corresponde al
              nombre de usuario <strong>@{data.parsedFound.username}</strong>,
              pero el link utilizado en el chequeo es de
              <strong>@{data.parsedQuery.username}</strong>.
            </WarnBox>
          </div>
        {/if}
      {:else}
        <ErrorBox>
          <svelte:fragment slot="title"
            >No habría sido likeado por Milei</svelte:fragment
          >
          Según nuestra base de datos, que contempla los likes a partir del 10 de
          febrero.
        </ErrorBox>
      {/if}
    {/if}
    <Prose>
      <ul>
        <li>Los datos disponibles son posteriores al 10 de febrero.</li>
        <li>
          Esta herramienta es experimental y podría dar resultados erróneos.
        </li>
      </ul>
    </Prose>
  </form>

  <Footer />
</div>

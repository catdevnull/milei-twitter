<script lang="ts">
  import { page } from "$app/stores";
  import ButtonPrimary from "$lib/components/ButtonPrimary.svelte";
  import ErrorBox from "$lib/components/ErrorBox.svelte";
  import InfoBox from "$lib/components/InfoBox.svelte";
  import WarnBox from "$lib/components/WarnBox.svelte";
  import Input from "$lib/components/Input.svelte";
  import Prose from "$lib/components/Prose.svelte";
  import {
    dateFormatter,
    dayjs,
    likesCutoff,
    longDateFormatter,
    timeFormatter,
  } from "$lib/consts";
  import Footer from "../Footer.svelte";
  import type { PageServerData } from "./$types";
  import Meta from "$lib/components/Meta.svelte";
  import cardPerfil from "$lib/assets/card-perfil-likes.jpg";

  export let data: PageServerData;
  $: query = $page.url.searchParams.get("url");
  $: chequeoIntentado = data.chequeoIntentado;
</script>

<Meta
  title="Chequeador de likes de @JMilei"
  description={'Verifica un "me gusta" de Twitter del presidente'}
  cardPath={cardPerfil}
  canonical={`https://milei.nulo.lol/chequear`}
/>

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
      {#if data.like}
        <div class="my-2">
          <InfoBox>
            <svelte:fragment slot="title"
              >Habría sido likeado por Milei el {#if data.linkToDate}<a
                  class="text-blue-200 underline"
                  href={`/?q=date:${dayjs(data.like.aproxLikedAt).format("YYYY-MM-DD")}`}
                  >{dateFormatter.format(data.like.aproxLikedAt)}</a
                >{:else}{dateFormatter.format(data.like.aproxLikedAt)}{/if}
              aproximadamente a las {timeFormatter.format(
                data.like.aproxLikedAt,
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
      {:else if data.retweet && likesCutoff && data.retweet.postedAt > likesCutoff.cutAt}
        <ErrorBox>
          <svelte:fragment slot="title"
            >No sabemos si lo likeó Milei</svelte:fragment
          >
          Este post fue publicado después de {longDateFormatter.format(
            likesCutoff?.cutAt,
          )}, por lo que no tenemos acceso los 'me gusta' de Milei en Twitter/X
          porque ahora son privados.
          <a
            class=" text-blue-100 underline"
            href="https://x.com/wanghaofei/status/1793096366132195529"
            >Más información</a
          >. Sin embargo, casi siempre que retweetea un tweet, lo likea.
        </ErrorBox>
      {:else}
        <ErrorBox>
          <svelte:fragment slot="title"
            >No habría sido likeado por Milei en el periodo que tenemos
            capturado</svelte:fragment
          >
          Según nuestra base de datos, que contempla los likes a partir del 29 de
          noviembre de 2023 {#if likesCutoff}
            hasta {longDateFormatter.format(likesCutoff.cutAt)}{/if}.
        </ErrorBox>
      {/if}
      {#if data.retweet}
        <div class="my-2">
          <InfoBox>
            <svelte:fragment slot="title"
              >Habría sido retweeteado por Milei el <a
                class="text-blue-200 underline"
                href={`/?q=date:${dayjs(data.retweet.retweetAt).format("YYYY-MM-DD")}`}
                >{dateFormatter.format(data.retweet.retweetAt)}</a
              >
              a las {timeFormatter.format(
                data.retweet.retweetAt,
              )}.</svelte:fragment
            >
          </InfoBox>
        </div>
      {/if}
    {/if}
    <Prose>
      <ul>
        <li>
          Los datos de likes disponibles son de entre 29 de noviembre de 2023
          hasta {longDateFormatter.format(likesCutoff?.cutAt)}.
        </li>
        <li>
          Los datos de retweets disponibles son posteriores al 11 de febrero de
          2024 en adelante.
        </li>
        <li>
          Esta herramienta es experimental y podría dar resultados erróneos.
        </li>
      </ul>
    </Prose>
  </form>

  <Footer />
</div>

<script lang="ts">
  import { page } from "$app/stores";
  import favicon from "$lib/assets/favicon.jpg";
  import defaultCard from "$lib/assets/card.jpg";

  export let title: string = "¿Cuántos tweets likeó nuestro Presidente hoy?";
  export let description: string =
    "Mira cuanto usa Twitter el Presidente Javier Milei";
  export let cardPath: string = defaultCard;
  export let keywords: boolean = false;
  export let canonical: string | undefined = undefined;
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="icon" href={favicon} />

  {#if canonical}
    <link rel="canonical" href={canonical} />
  {/if}

  <meta property="og:type" content="website" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={$page.url.href} />
  <meta property="og:image" content={cardPath} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@esoesnulo" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <!-- twitter requiere url completa https://leimao.github.io/blog/Missing-Image-Twitter-Card/ -->
  <meta name="twitter:image" content={"https://milei.nulo.lol" + cardPath} />

  {#if keywords}
    <meta
      name="keywords"
      content="how many tweets has our president liked today, milei, likes, twitter, argentina, president, presidente"
    />
  {/if}
</svelte:head>

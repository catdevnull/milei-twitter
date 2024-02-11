<script>
  import "../app.pcss";

  import card from "$lib/assets/card.jpg";
  import { dev } from "$app/environment";
</script>

<svelte:head>
  <title>¿Cuántos tweets likeó nuestro Presidente hoy?</title>
  <meta
    name="description"
    content="Mira cuanto usa Twitter el Presidente Javier Milei"
  />

  <meta property="og:type" content="website" />
  <meta
    property="og:title"
    content="¿Cuántos tweets likeó nuestro Presidente hoy?"
  />
  <meta
    property="og:description"
    content="Mira cuanto usa Twitter el Presidente Javier Milei"
  />
  <meta property="og:url" content="https://milei.nulo.ar" />
  <meta property="og:image" content={card} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@esoesnulo" />
  <meta
    name="twitter:title"
    content="¿Cuántos tweets likeó nuestro Presidente hoy?"
  />
  <meta
    name="twitter:description"
    content="Mira cuanto usa Twitter el Presidente Javier Milei"
  />
  <!-- twitter requiere url completa https://leimao.github.io/blog/Missing-Image-Twitter-Card/ -->
  <meta name="twitter:image" content={"https://milei.nulo.ar" + card} />

  {#if !dev}
    <script
      async
      src="https://umami.experimentos.nulo.ar/script.js"
      data-website-id="3728adc2-6131-4895-9b0c-98f3038d9126"
    ></script>
  {/if}
</svelte:head>

<!-- toca poncho? ( ͡° ͜ʖ ͡°) -->
<!-- <link
  href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css"
  rel="stylesheet"
/>
<link
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
  rel="stylesheet"
/>
<link
  href="https://unpkg.com/ar-poncho@2.0.315/dist/css/poncho.min.css"
  rel="stylesheet"
/> -->

<slot />

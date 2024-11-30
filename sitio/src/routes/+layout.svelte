<script>
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";

  import { dev } from "$app/environment";
</script>

<svelte:head>
  {#if !dev}
    <script
      async
      src="https://umami.experimentos.nulo.ar/script.js"
      data-website-id="3728adc2-6131-4895-9b0c-98f3038d9126"
    ></script>
  {/if}
</svelte:head>

<ModeWatcher />

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

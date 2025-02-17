<script>
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";

  import posthog from "posthog-js";
  import { onMount } from "svelte";

  onMount(() => {
    posthog.init("phc_II79EjC3Nzv1PCndY5L7VK7oDcdjux2SdbNZMvtKuMy", {
      api_host: "https://us.i.posthog.com",
      person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
    });
    return;
  });
</script>

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

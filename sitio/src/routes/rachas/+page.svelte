<script lang="ts">
  import type { PageData } from "./$types";
  import Footer from "../Footer.svelte";
  import Meta from "$lib/components/Meta.svelte";
  import InactivityRanking from "$lib/InactivityRanking.svelte";

  export let data: PageData;
</script>

<Meta
  title="Rachas sin actividad de @JMilei"
  description="Las pausas más largas entre actividades de Milei en Twitter"
  canonical="https://milei.nulo.lol/rachas"
/>

<div class="flex min-h-screen flex-col justify-center gap-2 py-4">
  <InactivityRanking
    streaks={data.inactivityRanking}
    period={data.inactivityPeriod}
    weekly={data.weeklyInactivity}
  />
  <Footer />
</div>

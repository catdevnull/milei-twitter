<script lang="ts">
  import type { PageData } from "./$types";
  import Chart from "./Chart.svelte";

  export let data: PageData;
</script>

<ul>
  <Chart tweets={data.tweets} />
</ul>

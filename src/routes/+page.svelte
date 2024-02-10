<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;

  const formatter = Intl.DateTimeFormat("es-AR", {
    timeStyle: "short",
    dateStyle: "medium",
  });
</script>

<ul>
  {#each data.tweets as tweet}
    <li>
      {tweet.url}
      <small>(registrado {formatter.format(tweet.firstSeenAt)})</small>
    </li>
  {/each}
</ul>

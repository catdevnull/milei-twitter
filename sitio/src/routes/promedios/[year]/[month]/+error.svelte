<script>
  import { page } from "$app/stores";
  import ButtonPrimary from "$lib/components/ButtonPrimary.svelte";
</script>

<section class="mx-auto w-full max-w-2xl p-4">
  <h1 class="text-3xl font-bold">
    {$page.status} - {$page.error?.message}
    <ButtonPrimary on:click={() => history.back()}>Pa atrás</ButtonPrimary>
  </h1>
</section>

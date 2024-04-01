<script lang="ts">
  import ErrorBox from "$lib/components/ErrorBox.svelte";
  import type { ActionData } from "./$types";

  export let form: ActionData;
</script>

<form method="POST" class="mx-auto max-w-lg p-2">
  {#if form?.error}
    <ErrorBox>
      {form?.error}
    </ErrorBox>
  {/if}

  <div class="flex gap-2">
    <input
      type="password"
      name="password"
      placeholder="Password"
      class="ring-offset-background inline-flex h-10 flex-grow rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900"
    />
    <button
      class="focus:shadow-outline inline-flex items-center justify-center rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium tracking-wide text-white transition-colors duration-200 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
    >
      Log in
    </button>
  </div>
</form>

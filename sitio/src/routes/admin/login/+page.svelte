<script lang="ts">
  import type { ActionData } from "./$types";

  export let form: ActionData;
</script>

<form method="POST" class="mx-auto max-w-lg p-2">
  {#if form?.error}
    <div
      class="[&>svg]:text-foreground relative mb-2 w-full rounded-lg border border-transparent bg-red-600 p-4 text-white [&:has(svg)]:pl-11 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4"
    >
      <svg
        class="h-5 w-5 -translate-y-0.5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        ><path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        /></svg
      >
      <h5 class="mb-1 font-medium leading-none tracking-tight">
        {form?.error}
      </h5>
    </div>
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

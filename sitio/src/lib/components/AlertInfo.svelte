<section class="mx-auto w-full max-w-2xl px-2">
  <div
    class="relative w-full rounded-lg border border-transparent bg-neutral-200 p-4 text-neutral-900 dark:bg-neutral-800 dark:text-white [&:has(svg)]:pl-11 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground"
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
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      /></svg
    >
    {#if $$slots.title}
      <h5 class="mb-1 font-medium leading-none tracking-tight">
        <slot name="title" />
      </h5>
    {/if}
    <div class="text-sm opacity-80">
      <slot />
    </div>
  </div>
</section>

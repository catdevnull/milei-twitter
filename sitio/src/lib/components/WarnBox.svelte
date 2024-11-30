<div
  class="relative w-full rounded-lg border border-transparent bg-yellow-700 p-4 text-white [&:has(svg)]:pl-11 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground"
>
  <svg
    class="h-6 w-6 -translate-y-0.5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
    ><path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    /></svg
  >
  <h5 class="mb-1 font-medium leading-none tracking-tight">
    <slot name="title" />
  </h5>
  <div class="text-sm opacity-80">
    <slot />
  </div>
</div>

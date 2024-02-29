<script lang="ts">
  import type { PageData, ActionData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const dateFormatter = Intl.DateTimeFormat("es-AR", {
    timeStyle: "medium",
    dateStyle: "medium",
  });
</script>

<div class="mx-auto flex max-w-[600px] flex-col gap-6 py-6 md:flex-row">
  <nav
    class="sticky top-0 mx-auto my-2 self-start bg-neutral-100 dark:bg-neutral-900"
  >
    <ul
      class="inline-flex divide-x divide-neutral-200 border border-neutral-200 md:flex-col md:divide-x-0 md:divide-y dark:divide-neutral-800 dark:border-neutral-800"
    >
      <a class="flex px-4 py-2 font-medium underline" href="#cuentas">Cuentas</a
      >
      <a class="flex px-4 py-2 font-medium underline" href="#scraps">Scraps</a>
    </ul>
  </nav>

  <main class="min-w-0 px-2">
    <section class="my-4">
      <h2 class="text-3xl font-black" id="cuentas">Cuentas</h2>

      <div class="flex flex-col">
        <div class="overflow-x-auto">
          <div class="inline-block min-w-full">
            <div class="overflow-hidden">
              <table class="min-w-full divide-y divide-neutral-200">
                <thead>
                  <tr class="text-neutral-500">
                    <th
                      class="px-5 py-3 text-left text-xs font-medium uppercase"
                      >ID</th
                    >
                    <th
                      class="px-5 py-3 text-left text-xs font-medium uppercase"
                      >Data</th
                    >
                    <!-- <th class="px-5 py-3 text-left text-xs font-medium uppercase"
                  >Address</th
                >
                <th class="px-5 py-3 text-right text-xs font-medium uppercase"
                  >Action</th
                > -->
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-200">
                  {#each data.cuentas as cuenta}
                    <tr class="text-neutral-800 dark:text-neutral-300">
                      <td
                        class="whitespace-nowrap px-5 py-4 text-sm font-medium"
                        >{cuenta.id}</td
                      >
                      <td class="break-all px-5 py-4 text-sm"
                        >{cuenta.accountDataJson}</td
                      >

                      <!--
                    
                                      <td class="whitespace-nowrap px-5 py-4 text-sm">30</td>
      <td
                    class="whitespace-nowrap px-5 py-4 text-right text-sm font-medium"
                  >
                    <a class="text-blue-600 hover:text-blue-700" href="#"
                      >Edit</a
                    >
                  </td> -->
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <form method="POST" action="?/addAccount" class="p-2">
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

        <div class="flex flex-col gap-2">
          <input
            type="text"
            name="auth_token"
            placeholder="auth_token (el corto)"
            class="ring-offset-background inline-flex h-10 flex-grow rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900"
          />
          <input
            type="text"
            name="ct0"
            placeholder="ct0 (el largo)"
            class="ring-offset-background inline-flex h-10 flex-grow rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900"
          />
          <button
            class="focus:shadow-outline inline-flex items-center justify-center rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium tracking-wide text-white transition-colors duration-200 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
          >
            Agregar cuenta
          </button>
        </div>
      </form>
    </section>
    <section class="my-4">
      <h2 class="text-3xl font-black" id="scraps">Scraps</h2>

      <div class="flex flex-col">
        <div class="overflow-x-auto">
          <div class="inline-block min-w-full">
            <div class="overflow-hidden">
              <table class="min-w-full divide-y divide-neutral-200">
                <thead>
                  <tr class="text-neutral-500">
                    <th
                      class="px-5 py-3 text-left text-xs font-medium uppercase"
                      >ID</th
                    >
                    <th
                      class="px-5 py-3 text-left text-xs font-medium uppercase"
                      >At</th
                    >
                    <th
                      class="px-5 py-3 text-left text-xs font-medium uppercase"
                      >Cuenta</th
                    >
                    <th
                      class="px-5 py-3 text-left text-xs font-medium uppercase"
                      >Tweets</th
                    >
                    <!-- <th class="px-5 py-3 text-left text-xs font-medium uppercase"
                  >Address</th
                >
                <th class="px-5 py-3 text-right text-xs font-medium uppercase"
                  >Action</th
                > -->
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-200">
                  {#each data.scraps as scrap}
                    <tr class="text-neutral-800 dark:text-neutral-300">
                      <td
                        class="whitespace-nowrap px-5 py-2 text-sm font-medium"
                        >{scrap.id}</td
                      >
                      <td class="whitespace-nowrap px-5 py-2 text-sm"
                        >{dateFormatter.format(scrap.finishedAt)}</td
                      >
                      <td class="whitespace-nowrap px-5 py-2 text-sm"
                        >{scrap.cuentaId}</td
                      >
                      <td class="whitespace-nowrap px-5 py-2 text-sm"
                        >{scrap.likedTweets.length}</td
                      >

                      <!--
                    
                                      <td class="whitespace-nowrap px-5 py-4 text-sm">30</td>
      <td
                    class="whitespace-nowrap px-5 py-4 text-right text-sm font-medium"
                  >
                    <a class="text-blue-600 hover:text-blue-700" href="#"
                      >Edit</a
                    >
                  </td> -->
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</div>

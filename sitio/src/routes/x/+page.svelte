<script lang="ts">
  import Meta from "$lib/components/Meta.svelte";
  import {
    Repeat2,
    MessageCircle,
    Heart,
    BarChart2,
    Share,
    MoreHorizontal,
    Home,
    Search,
    Bell,
    Mail,
    Users,
    User,
    MapPin,
    Link as LinkIcon,
    Calendar,
    ArrowLeft,
    BadgeCheck,
    Search as SearchIcon,
    Bookmark,
  } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  $: retweets = data.retweets.map((retweet) => ({
    ...retweet,
    retweetAt: new Date(retweet.retweetAt),
    postedAt: retweet.postedAt
      ? new Date(retweet.postedAt)
      : new Date(retweet.retweetAt),
  }));

  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

  function formatTime(date: Date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return `${diffSec}s`;
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;

    // If same year
    if (date.getFullYear() === now.getFullYear()) {
      return `${date.getDate()} ${months[date.getMonth()]}`;
    }
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function formatFullDate(date: Date) {
    // 3:45 p. m. · 20 sept. 2025
    return new Intl.DateTimeFormat("es-AR", {
      hour: "numeric",
      minute: "numeric",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  function avatarColor(handle: string | null) {
    const palette = [
      "bg-sky-500",
      "bg-emerald-500",
      "bg-rose-500",
      "bg-amber-500",
      "bg-purple-500",
      "bg-indigo-500",
    ];
    if (!handle) return palette[0];
    const idx =
      handle.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      palette.length;
    return palette[idx];
  }
</script>

<Meta
  title="Javier Milei (@JMilei) / X"
  description="Retweets de Javier Milei visualizados como un feed de X."
  canonical="https://milei.nulo.lol/x"
/>

<div
  class="min-h-screen bg-black font-sans text-[#e7e9ea] selection:bg-[#1d9bf0] selection:text-white"
>
  <div class="mx-auto flex max-w-[1265px] justify-center">
    <!-- Sidebar -->
    <header
      class="hidden w-[88px] flex-col items-end px-2 sm:flex xl:w-[275px] xl:items-start"
    >
      <div
        class="fixed top-0 flex h-full w-[88px] flex-col justify-between overflow-y-auto pb-4 xl:w-[275px] xl:px-2"
      >
        <div class="flex w-full flex-col items-center xl:items-start">
          <!-- Logo -->
          <div
            class="my-1 flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[#181818]"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              class="h-[30px] w-[30px] fill-white"
              ><g
                ><path
                  d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                ></path></g
              ></svg
            >
          </div>

          <!-- Nav Items -->
          <nav class="mt-1 flex w-full flex-col gap-1">
            <a
              href="/"
              class="group flex w-full items-center justify-center xl:justify-start"
            >
              <div
                class="flex items-center gap-4 rounded-full px-4 py-3 transition-colors duration-200 group-hover:bg-[#181818]"
              >
                <Home class="h-[26px] w-[26px]" />
                <span class="hidden text-xl font-normal xl:block">Inicio</span>
              </div>
            </a>
            <div
              class="group flex w-full cursor-pointer items-center justify-center xl:justify-start"
            >
              <div
                class="flex items-center gap-4 rounded-full px-4 py-3 transition-colors duration-200 group-hover:bg-[#181818]"
              >
                <Search class="h-[26px] w-[26px]" />
                <span class="hidden text-xl font-normal xl:block">Explorar</span
                >
              </div>
            </div>
            <div
              class="group flex w-full cursor-pointer items-center justify-center xl:justify-start"
            >
              <div
                class="flex items-center gap-4 rounded-full px-4 py-3 transition-colors duration-200 group-hover:bg-[#181818]"
              >
                <Bell class="h-[26px] w-[26px]" />
                <span class="hidden text-xl font-normal xl:block"
                  >Notificaciones</span
                >
              </div>
            </div>
            <div
              class="group flex w-full cursor-pointer items-center justify-center xl:justify-start"
            >
              <div
                class="flex items-center gap-4 rounded-full px-4 py-3 transition-colors duration-200 group-hover:bg-[#181818]"
              >
                <Mail class="h-[26px] w-[26px]" />
                <span class="hidden text-xl font-normal xl:block">Mensajes</span
                >
              </div>
            </div>
            <div
              class="group flex w-full cursor-pointer items-center justify-center xl:justify-start"
            >
              <div
                class="flex items-center gap-4 rounded-full px-4 py-3 transition-colors duration-200 group-hover:bg-[#181818]"
              >
                <div class="relative">
                  <div
                    class="flex h-[26px] w-[26px] items-center justify-center rounded-sm border-2 border-current text-[10px] font-bold"
                  >
                    /
                  </div>
                </div>
                <span class="hidden text-xl font-normal xl:block">Grok</span>
              </div>
            </div>
            <div
              class="group flex w-full cursor-pointer items-center justify-center xl:justify-start"
            >
              <div
                class="flex items-center gap-4 rounded-full px-4 py-3 transition-colors duration-200 group-hover:bg-[#181818]"
              >
                <Users class="h-[26px] w-[26px]" />
                <span class="hidden text-xl font-normal xl:block"
                  >Comunidades</span
                >
              </div>
            </div>
            <div
              class="group flex w-full cursor-pointer items-center justify-center xl:justify-start"
            >
              <div
                class="flex items-center gap-4 rounded-full px-4 py-3 transition-colors duration-200 group-hover:bg-[#181818]"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  class="h-[26px] w-[26px] fill-current"
                  ><g
                    ><path
                      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                    ></path></g
                  ></svg
                >
                <span class="hidden text-xl font-normal xl:block">Premium</span>
              </div>
            </div>
            <div
              class="group flex w-full cursor-pointer items-center justify-center xl:justify-start"
            >
              <div
                class="flex items-center gap-4 rounded-full px-4 py-3 transition-colors duration-200 group-hover:bg-[#181818]"
              >
                <User class="h-[26px] w-[26px] stroke-[2.5]" />
                <span class="hidden text-xl font-bold xl:block">Perfil</span>
              </div>
            </div>
            <div
              class="group flex w-full cursor-pointer items-center justify-center xl:justify-start"
            >
              <div
                class="flex items-center gap-4 rounded-full px-4 py-3 transition-colors duration-200 group-hover:bg-[#181818]"
              >
                <div
                  class="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-current"
                >
                  <MoreHorizontal class="h-5 w-5" />
                </div>
                <span class="hidden text-xl font-normal xl:block"
                  >Más opciones</span
                >
              </div>
            </div>
          </nav>

          <div class="my-4 w-full px-2 xl:px-0">
            <button
              class="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#1d9bf0] shadow-lg transition hover:bg-[#1a8cd8] xl:w-[90%] xl:px-8"
            >
              <span class="hidden text-[17px] font-bold text-white xl:block"
                >Postear</span
              >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                class="h-6 w-6 fill-white xl:hidden"
                ><g
                  ><path
                    d="M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6 17.331 6 22h2c0-1.007.07-2.012.19-3H12c4.1 0 7.48-3.082 7.94-7.054C22.79 10.147 23.17 6.359 23 3zm-7 8h-1.5v2H16c.63-.016 1.2-.08 1.72-.188C16.95 15.24 14.68 17 12 17H8.55c.57-2.512 1.57-4.851 3-6.78 2.16-2.912 5.29-4.911 9.45-5.187C20.95 8.079 19.9 11 16 11zM4 9V6H1V4h3V1h2v3h3v2H6v3H4z"
                  ></path></g
                ></svg
              >
            </button>
          </div>
        </div>

        <div
          class="my-3 flex w-full items-center justify-center px-2 xl:justify-start"
        >
          <div
            class="group flex w-full cursor-pointer items-center gap-3 rounded-full p-3 transition hover:bg-[#181818]"
          >
            <div class="h-10 w-10 rounded-full bg-neutral-700"></div>
            <div class="hidden flex-1 xl:block">
              <p class="text-[15px] font-bold leading-5 text-[#e7e9ea]">
                Usuario
              </p>
              <p class="text-[15px] text-[#71767b]">@usuario</p>
            </div>
            <MoreHorizontal class="hidden h-5 w-5 text-[#e7e9ea] xl:block" />
          </div>
        </div>
      </div>
    </header>

    <!-- Main Feed -->
    <main
      class="flex w-full max-w-[600px] flex-col border-x border-[#2f3336] pb-[600px]"
    >
      <!-- Header -->
      <div
        class="sticky top-0 z-10 flex h-[53px] items-center bg-black/65 px-4 backdrop-blur-md"
      >
        <div class="mr-9 cursor-pointer rounded-full p-2 hover:bg-[#181818]">
          <ArrowLeft class="h-5 w-5" />
        </div>
        <div class="flex flex-col">
          <h2 class="text-[20px] font-bold leading-6 text-[#e7e9ea]">
            Javier Milei
          </h2>
          <span class="text-[13px] text-[#71767b]">12.3k posts</span>
        </div>
      </div>

      <!-- Profile Banner -->
      <div class="relative h-[200px] bg-[#333]">
        <!-- Banner Image Placeholder -->
      </div>

      <!-- Profile Info -->
      <div class="relative px-4 pb-4">
        <div class="flex justify-between">
          <div
            class="-mt-[13%] mb-3 h-[134px] w-[134px] rounded-full border-4 border-black bg-black"
          >
            <!-- Avatar -->
            <div
              class="h-full w-full rounded-full bg-gradient-to-br from-amber-500 to-purple-500"
            ></div>
          </div>
          <div class="mt-3">
            <button
              class="rounded-full bg-[#e7e9ea] px-4 py-1.5 text-[15px] font-bold text-[#0f1419] transition-colors hover:bg-[#d7dbdc]"
            >
              Seguir
            </button>
          </div>
        </div>

        <div class="mt-1">
          <div class="flex items-center gap-1">
            <h1 class="text-[20px] font-bold leading-6 text-[#e7e9ea]">
              Javier Milei
            </h1>
            <BadgeCheck class="h-5 w-5 fill-current text-[#829aab]" />
          </div>
          <div class="text-[15px] text-[#71767b]">@JMilei</div>
        </div>

        <div class="mt-4 text-[15px] leading-5 text-[#e7e9ea]">
          Presidente de la Nación Argentina. Economista.
        </div>

        <div
          class="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[15px] text-[#71767b]"
        >
          <div class="flex items-center gap-1">
            <MapPin class="h-[18px] w-[18px]" />
            <span>Argentina</span>
          </div>
          <div class="flex items-center gap-1">
            <LinkIcon class="h-[18px] w-[18px]" />
            <a
              href="https://presidencia.gob.ar"
              class="text-[#1d9bf0] hover:underline">presidencia.gob.ar</a
            >
          </div>
          <div class="flex items-center gap-1">
            <Calendar class="h-[18px] w-[18px]" />
            <span>Se unió en abril de 2012</span>
          </div>
        </div>

        <div class="mt-3 flex gap-5 text-[15px]">
          <a href="/" class="hover:underline"
            ><span class="font-bold text-[#e7e9ea]">450</span>
            <span class="text-[#71767b]">Siguiendo</span></a
          >
          <a href="/" class="hover:underline"
            ><span class="font-bold text-[#e7e9ea]">3.2M</span>
            <span class="text-[#71767b]">Seguidores</span></a
          >
        </div>
      </div>

      <!-- Tabs -->
      <div class="no-scrollbar flex overflow-x-auto border-b border-[#2f3336]">
        <div
          class="flex h-[53px] min-w-[80px] flex-1 cursor-pointer items-center justify-center px-4 transition-colors hover:bg-[#181818]"
        >
          <div class="relative flex h-full items-center">
            <span class="font-bold text-[#e7e9ea]">Posts</span>
            <div
              class="absolute bottom-0 left-0 h-[4px] w-full rounded-full bg-[#1d9bf0]"
            ></div>
          </div>
        </div>
        <div
          class="flex h-[53px] min-w-[80px] flex-1 cursor-pointer items-center justify-center px-4 transition-colors hover:bg-[#181818]"
        >
          <span class="font-medium text-[#71767b]">Respuestas</span>
        </div>
        <div
          class="flex h-[53px] min-w-[80px] flex-1 cursor-pointer items-center justify-center px-4 transition-colors hover:bg-[#181818]"
        >
          <span class="font-medium text-[#71767b]">Destacados</span>
        </div>
        <div
          class="flex h-[53px] min-w-[80px] flex-1 cursor-pointer items-center justify-center px-4 transition-colors hover:bg-[#181818]"
        >
          <span class="font-medium text-[#71767b]">Fotos y videos</span>
        </div>
        <div
          class="flex h-[53px] min-w-[80px] flex-1 cursor-pointer items-center justify-center px-4 transition-colors hover:bg-[#181818]"
        >
          <span class="font-medium text-[#71767b]">Me gusta</span>
        </div>
      </div>

      <!-- Tweets -->
      {#each retweets as retweet}
        <article
          class="flex cursor-pointer border-b border-[#2f3336] px-4 py-3 transition-colors hover:bg-[#080808]"
        >
          <div class="mr-3 flex flex-col items-end">
            <div class="mb-1 flex w-10 justify-end">
              <Repeat2 class="h-4 w-4 text-[#71767b]" />
            </div>
            <div
              class={`h-10 w-10 rounded-full ${avatarColor(retweet.posterHandle)} flex items-center justify-center font-bold text-white`}
            >
              {retweet.posterHandle?.[0]?.toUpperCase() ?? "X"}
            </div>
          </div>
          <div class="flex-1 pb-1">
            <div
              class="mb-1 flex items-center gap-1 text-[13px] font-bold text-[#71767b]"
            >
              <span>Javier Milei retwitteó</span>
            </div>
            <div class="flex items-center gap-1 leading-5">
              <span class="font-bold text-[#e7e9ea] hover:underline"
                >@{retweet.posterHandle ?? "usuario"}</span
              >
              <span class="text-[15px] text-[#71767b]"
                >@{retweet.posterHandle ?? "usuario"}</span
              >
              <span class="text-[15px] text-[#71767b]">·</span>
              <span class="text-[15px] text-[#71767b] hover:underline"
                >{formatTime(retweet.postedAt)}</span
              >
            </div>
            <div
              class="mt-1 whitespace-pre-wrap break-words text-[15px] leading-5 text-[#e7e9ea]"
            >
              {retweet.text}
            </div>

            <!-- Actions -->
            <div class="mt-3 flex max-w-[425px] justify-between text-[#71767b]">
              <div class="group flex items-center gap-1 hover:text-[#1d9bf0]">
                <div class="rounded-full p-2 group-hover:bg-[#1d9bf0]/10">
                  <MessageCircle class="h-[18px] w-[18px]" />
                </div>
                <span class="text-[13px] group-hover:text-[#1d9bf0]">32</span>
              </div>
              <div class="group flex items-center gap-1 hover:text-[#00ba7c]">
                <div class="rounded-full p-2 group-hover:bg-[#00ba7c]/10">
                  <Repeat2 class="h-[18px] w-[18px]" />
                </div>
                <span class="text-[13px] group-hover:text-[#00ba7c]">1.2k</span>
              </div>
              <div class="group flex items-center gap-1 hover:text-[#f91880]">
                <div class="rounded-full p-2 group-hover:bg-[#f91880]/10">
                  <Heart class="h-[18px] w-[18px]" />
                </div>
                <span class="text-[13px] group-hover:text-[#f91880]">5k</span>
              </div>
              <div class="group flex items-center gap-1 hover:text-[#1d9bf0]">
                <div class="rounded-full p-2 group-hover:bg-[#1d9bf0]/10">
                  <BarChart2 class="h-[18px] w-[18px]" />
                </div>
                <span class="text-[13px] group-hover:text-[#1d9bf0]">120k</span>
              </div>
              <div class="group flex items-center gap-1 hover:text-[#1d9bf0]">
                <div class="rounded-full p-2 group-hover:bg-[#1d9bf0]/10">
                  <Bookmark class="h-[18px] w-[18px]" />
                </div>
              </div>
              <div class="group flex items-center gap-1 hover:text-[#1d9bf0]">
                <div class="rounded-full p-2 group-hover:bg-[#1d9bf0]/10">
                  <Share class="h-[18px] w-[18px]" />
                </div>
              </div>
            </div>
          </div>
        </article>
      {/each}
    </main>

    <!-- Right Section -->
    <aside class="hidden w-[350px] pl-8 lg:block">
      <div class="fixed h-full w-[350px] overflow-y-auto pb-8">
        <!-- Search -->
        <div class="sticky top-0 z-10 mb-2 bg-black py-2">
          <div class="group relative">
            <div
              class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#71767b] group-focus-within:text-[#1d9bf0]"
            >
              <SearchIcon class="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="Buscar"
              class="w-full rounded-full border-none bg-[#202327] py-3 pl-12 pr-4 text-[15px] text-[#e7e9ea] placeholder-[#71767b] focus:bg-black focus:ring-1 focus:ring-[#1d9bf0]"
            />
          </div>
        </div>

        <!-- Auth Box (Mock) -->
        <div class="mb-4 rounded-2xl border border-[#2f3336] p-4">
          <h2 class="mb-2 text-[20px] font-bold leading-6 text-[#e7e9ea]">
            Suscríbete a Premium
          </h2>
          <p class="mb-3 text-[15px] text-[#e7e9ea]">
            Suscríbete para desbloquear nuevas funciones y, si eres elegible,
            recibir una cuota de ingresos por anuncios.
          </p>
          <button
            class="rounded-full bg-[#1d9bf0] px-4 py-2 text-[15px] font-bold text-white hover:bg-[#1a8cd8]"
            >Suscribirse</button
          >
        </div>

        <!-- Trends -->
        <div class="rounded-2xl bg-[#16181c] pt-3">
          <h2 class="mb-3 px-4 text-[20px] font-bold text-[#e7e9ea]">
            Qué está pasando
          </h2>

          <div
            class="cursor-pointer px-4 py-3 transition-colors hover:bg-[#1d1f23]"
          >
            <div
              class="flex items-center justify-between text-[13px] text-[#71767b]"
            >
              <span>Política · Tendencia</span>
              <MoreHorizontal class="h-4 w-4" />
            </div>
            <div class="font-bold text-[#e7e9ea]">Milei</div>
            <div class="text-[13px] text-[#71767b]">125 mil posts</div>
          </div>

          <div
            class="cursor-pointer px-4 py-3 transition-colors hover:bg-[#1d1f23]"
          >
            <div
              class="flex items-center justify-between text-[13px] text-[#71767b]"
            >
              <span>Economía · Tendencia</span>
              <MoreHorizontal class="h-4 w-4" />
            </div>
            <div class="font-bold text-[#e7e9ea]">Inflación</div>
            <div class="text-[13px] text-[#71767b]">50 mil posts</div>
          </div>

          <div
            class="cursor-pointer px-4 py-3 transition-colors hover:bg-[#1d1f23]"
          >
            <div
              class="flex items-center justify-between text-[13px] text-[#71767b]"
            >
              <span>Argentina · Tendencia</span>
              <MoreHorizontal class="h-4 w-4" />
            </div>
            <div class="font-bold text-[#e7e9ea]">VLLC</div>
            <div class="text-[13px] text-[#71767b]">89 mil posts</div>
          </div>

          <div
            class="cursor-pointer rounded-b-2xl px-4 py-4 text-[15px] text-[#1d9bf0] transition-colors hover:bg-[#1d1f23]"
          >
            Mostrar más
          </div>
        </div>

        <div
          class="mt-4 flex flex-wrap gap-x-3 gap-y-1 px-4 text-[13px] text-[#71767b]"
        >
          <a href="/" class="hover:underline">Condiciones de servicio</a>
          <a href="/" class="hover:underline">Política de Privacidad</a>
          <a href="/" class="hover:underline">Política de cookies</a>
          <a href="/" class="hover:underline">Accesibilidad</a>
          <a href="/" class="hover:underline">Información de anuncios</a>
          <div class="flex items-center gap-1">
            More <MoreHorizontal class="h-3 w-3" />
          </div>
          <span>© 2025 X Corp.</span>
        </div>
      </div>
    </aside>
  </div>
</div>

<style>
  :global(body) {
    background-color: black;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>

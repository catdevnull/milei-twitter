<script lang="ts">
  import Fondo from "./assets/FONDO.jpg";
  import Fuente from "./assets/FUENTE 2.png";
  import Logo from "./assets/OPINION PUBLICA logo.png";
</script>

<link
  href="https://cdn.jsdelivr.net/gh/repalash/gilroy-free-webfont@fonts/Gilroy-Extrabold.css"
  rel="stylesheet"
/>

<!-- azul 5ea1b4 / rojo d83926 -->

<div
  class="flex min-h-screen w-screen flex-col items-center bg-[#5ea1b4] font-gilroy font-bold uppercase text-black"
  style={`background: url(${Fondo})`}
>
  <div class="mx-auto inline-flex min-w-0 flex-col items-center">
    <h1
      class="min-w-0 px-8 pb-12 pt-16 text-center text-7xl font-extrabold drop-shadow-opinionPublicaAzul"
    >
      <slot name="title" />
    </h1>

    <div
      class="border-collapse-[separate] mx-auto box-border inline-flex rounded-3xl border-4 border-black bg-[#5ea1b4] text-4xl drop-shadow-opinionPublica"
    >
      <slot name="content" />
    </div>

    <footer class="mt-12 flex w-full justify-between">
      <img class="h-28" src={Logo} />
      <img class="h-28" src={Fuente} />
    </footer>
  </div>
</div>

<script lang="ts">
  import cortaImg from "$lib/assets/press-logos/corta.png?enhanced";
  import elDestapeImg from "$lib/assets/press-logos/el-destape.png?enhanced";
  import elPaisImg from "$lib/assets/press-logos/el-pais.png?enhanced";
  import lpoImg from "$lib/assets/press-logos/lpo.svg";
  import mdzolImg from "$lib/assets/press-logos/mdzol.png?enhanced";
  import pagina12Img from "$lib/assets/press-logos/pagina12.png?enhanced";
  import perfilImg from "$lib/assets/press-logos/perfil.svg";
  import tiempoArgentinoImg from "$lib/assets/press-logos/tiempo-argentino.png?enhanced";
  import clarinImg from "$lib/assets/press-logos/clarin.svg";
  import radioConVosImg from "$lib/assets/press-logos/radio-con-vos.png?enhanced";
  import blenderImg from "$lib/assets/press-logos/blender.png?enhanced";
  import timeImg from "$lib/assets/press-logos/time.svg";
  const refs = [
    // {
    //   href: "https://www.tiempoar.com.ar/ta_article/javier-milike-el-presidente-pasa-mas-de-tres-horas-por-dia-tuiteando/",
    //   img: tiempoArgentinoImg,
    //   alt: "Tiempo Argentino",
    // },
    // {
    //   href: "https://www.mdzol.com/politica/2024/2/16/cuanto-tiempo-pasa-javier-milei-en-la-red-social-406283.html",
    //   img: mdzolImg,
    //   alt: "MDZol",
    // },
    {
      href: "https://time.com/6980600/javier-milei-argentina-interview/#:~:text=He%E2%80%99s%20so%20prolific%20on%20the%20platform%20that%20an%20Argentine%20programmer%20set%20up%20a%20popular%20website%20called%20%E2%80%9CHow%20many%20tweets%20has%20our%20President%20liked%20today%3F%E2%80%9D%20On%20the%20day%20we%20spoke%2C%20he%20liked%20or%20retweeted%20336%20posts%2C%20much%20of%20it%20delirious%20all%2Dcaps%20praise%20of%20himself.",
      img: timeImg,
      alt: "TIME magazine",
    },
    {
      href: "https://www.perfil.com/noticias/politica/milei-el-presidente-tuitero-trolls-libertarios-y-periodistas-entre-sus-favoritos.phtml",
      img: perfilImg,
      alt: "Perfil",
      imgClass: "dark:invert",
    },
    {
      href: "https://www.clarin.com/tecnologia/tuits-likeo-presidente-funciona-robot-creo-chico-18-anos-tomar-frenetico-pulso-javier-milei-twitter_0_WCBrRbDqs6.html",
      img: clarinImg,
      alt: "Clarin",
    },
    {
      href: "https://www.eldestapeweb.com/atr/javier-milei/cuanto-tiempo-pasa-javier-milei-en-las-redes-crearon-una-pagina-que-expone-al-presidente-20242161370",
      img: pagina12Img,
      alt: "Página 12",
      imgClass: "dark:invert",
    },
    {
      href: "https://www.lapoliticaonline.com/politica/analisis-de-los-favoritos-de-milei-en-twitter-trolls-libertarios-y-majul/",
      img: lpoImg,
      alt: "La Política Online",
      imgClass: "dark:invert",
    },
    {
      href: "https://www.lagaceta.com.ar/nota/1024699/politica/cuanto-tiempo-dedica-javier-milei-redes-sociales.html",
      img: elPaisImg,
      alt: "El País",
      imgClass: "dark:invert",
    },
    {
      href: "https://x.com/ertenembaum/status/1761938342772343260",
      img: radioConVosImg,
      alt: "Radio con Vos",
    },
    {
      href: "https://www.youtube.com/watch?v=SGk_DjrV-k4",
      img: blenderImg,
      alt: "Blender",
    },
    {
      href: "https://www.eldestapeweb.com/atr/javier-milei/cuanto-tiempo-pasa-javier-milei-en-las-redes-crearon-una-pagina-que-expone-al-presidente-20242161370",
      img: elDestapeImg,
      alt: "El Destape",
      imgClass: "dark:drop-shadow-[0_0_4px_rgba(255,255,255,1)]",
    },
    // {
    //   href: "https://corta.com/politica/cuanto-tiempo-pasa-milei-x-pagina-creo-usuario-contar-sus-me-gusta-n22260",
    //   img: cortaImg,
    //   alt: "Corta",
    //   imgClass: "invert",
    // },
  ];
</script>

<!-- https://magicui.design/docs/components/marquee -->
<div
  class="group relative flex h-[400px] w-full flex-col gap-4 overflow-hidden bg-neutral-200 [--duration:10s] [--gap:1rem] md:my-4 md:h-auto md:flex-row md:gap-8 md:bg-black md:bg-transparent md:[--duration:25s] md:[--gap:2rem] dark:bg-neutral-950"
>
  <!-- {#each refs as ref}
    <a
      href={ref.href}
      class="mx-8 block"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img src={ref.img} alt={ref.alt} class="h-8 dark:invert" />
    </a>
  {/each} -->
  {#each [1, 2] as _}
    <div
      class="animate-marquee-vertical md:animate-marquee flex shrink-0 flex-col items-center whitespace-nowrap [gap:var(--gap)] group-hover:[animation-play-state:paused] md:flex-row md:justify-around"
    >
      {#each refs as ref}
        <a
          href={ref.href}
          class="block"
          target="_blank"
          rel="noopener noreferrer"
        >
          {#if typeof ref.img === "string"}
            <img
              src={ref.img}
              alt={ref.alt}
              class={`h-8 ${ref.imgClass ?? ""}`}
            />
          {:else}
            <enhanced:img
              src={ref.img}
              alt={ref.alt}
              class={`h-8 w-auto ${ref.imgClass ?? ""}`}
            />
          {/if}
        </a>
      {/each}
    </div>
  {/each}
  <div
    class="dark:from-background pointer-events-none absolute inset-x-0 -top-1 h-1/3 bg-gradient-to-b from-neutral-100 md:hidden"
  ></div>
  <div
    class="dark:from-background pointer-events-none absolute inset-x-0 -bottom-1 h-1/3 bg-gradient-to-t from-neutral-100 md:hidden"
  ></div>
</div>

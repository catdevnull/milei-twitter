<script lang="ts">
  import Prose from "$lib/components/Prose.svelte";
  import markdownit from "markdown-it";
  import markdownItAnchor from "markdown-it-anchor";
  // @ts-ignore
  import markdownItToc from "markdown-it-table-of-contents";
  import Meta from "$lib/components/Meta.svelte";
  const md = markdownit({
    html: true,
  });
  md.use(markdownItAnchor);
  md.use(markdownItToc, {
    includeLevel: [2],
  });

  const result = md.render(`
[milei.nulo.lol](https://milei.nulo.lol)

# Preguntas frequentes

[[toc]]

## ¿Realmente es Milei el que maneja su Twitter?

Si, [según él mismo](https://twitter.com/somoscorta/status/1761792806702444956) es él el que maneja su cuenta de Twitter.

## ¿Como puedo verificar un like de Milei?

Como ya detecté en varias ocasiones que se generen capturas de pantallas falsas de los likes de Milei, hice [una herramienta](https://milei.nulo.lol/chequear) que cualquiera puede usar para verificarlos. Tan solo tiene que copiar el enlace del tweet original y pegarlo en el sitio. ¿Dudas? ¡Contactame!

## ¿Como calculas el tiempo en Twitter?

Básicamente, la idea es medir las sesiones que tendría Milei en Twitter. Scrapeo el minuto aproximando en que @JMilei likea algo, y después encuentro los grupos de likes consecutivos que distan menos de 3 min entre sí. Agrego 2min a cada grupo ya que se presume que antes de hacer el primer like de la sesión está ~1min, y que después del último like de la sesión está ~1min más. Se suman todos los rangos de tiempo, y así se genera el total. Se pueden ver los rangos de tiempo calculados en la página.

Los valores de 3min entre likes y 2min extra por grupo son arbitrarios y relativamente conservadores.

## ¡Quiero saber más sobre el Twitter de Milei!

Eso no es una pregunta, pero fijate los análisis de LA NACION y Chequeado:
- [Desvelos, arrebatos y castigos - Así funciona el Twitter de Milei, la ametralladora del nuevo relato oficial - LA NACION](https://www.lanacion.com.ar/politica/desvelos-arrebatos-y-castigos-asi-funciona-el-twitter-de-javier-milei-la-ametralladora-del-nuevo-nid17022024/)
- [Javier Milei y su cuenta de X: quiénes son los tuiteros favoritos del presidente con los que construye su discurso - Chequeado](https://chequeado.com/investigaciones/javier-milei-y-su-cuenta-de-x-quienes-son-los-tuiteros-favoritos-del-presidente-con-los-que-construye-su-discurso/)

Si estás haciendo algo similar, ¡contactame!

## ¿Donde puedo descargar los datos?

Podés descargar los últimos datos de likes y retweets en formato CSV:

<a href="/api/datasets/likes.csv" class="focus:shadow-outline inline-flex items-center justify-center rounded-md bg-neutral-800 px-4 py-2 mr-2 text-sm font-medium tracking-wide text-white transition-colors duration-200 dark:hover:bg-neutral-800/50 hover:bg-neutral-900/80 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2">
  likes.csv
</a>  
<a href="/api/datasets/retweets.csv" class="focus:shadow-outline inline-flex items-center justify-center rounded-md bg-neutral-800 px-4 py-2 mr-2 text-sm font-medium tracking-wide text-white transition-colors duration-200 dark:hover:bg-neutral-800/50 hover:bg-neutral-900/80 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2">
  retweets.csv
</a>  
<a href="/api/datasets/tweets.jsonl" class="focus:shadow-outline inline-flex items-center justify-center rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium tracking-wide text-white transition-colors duration-200 dark:hover:bg-neutral-800/50 hover:bg-neutral-900/80 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2">
  tweets.jsonl
</a>

Tené en cuenta que solo contempla los datos que pudimos capturar.

## ¿Donde puedo contactarte?

Podés mandarme un mensaje por Telegram ([@esoesnulo](https://t.me/esoesnulo)), un mensaje directo por Twitter ([@esoesnulo](https://twitter.com/esoesnulo)) o enviarme un mail ([milei@nulo.in](mailto:milei@nulo.in)).

`);
</script>

<Meta title="Preguntas frecuentes - milei.nulo.lol" />

<main class="mx-auto px-2 py-7">
  <Prose>
    {@html result}
  </Prose>
</main>

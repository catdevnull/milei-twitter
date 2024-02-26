<script lang="ts">
  export const csr = false;

  import markdownit from "markdown-it";
  import markdownItAnchor from "markdown-it-anchor";
  // @ts-ignore
  import markdownItToc from "markdown-it-table-of-contents";
  const md = markdownit();
  md.use(markdownItAnchor);
  md.use(markdownItToc, {
    includeLevel: [2],
  });

  const result = md.render(`
[milei.nulo.in](https://milei.nulo.in)

# Preguntas frequentes

[[toc]]

## ¿Realmente es Milei el que maneja su Twitter?

Si, [según él mismo](https://twitter.com/somoscorta/status/1761792806702444956) es él el que maneja su cuenta de Twitter.

## ¿Como calculas el tiempo en Twitter?

Básicamente, la idea es medir las sesiones que tendría Milei en Twitter. Scrapeo el minuto aproximando en que @JMilei likea algo, y después encuentro los grupos de likes consecutivos que distan menos de 3 min entre sí. Agrego 2min a cada grupo ya que se presume que antes de hacer el primer like de la sesión está ~1min, y que después del último like de la sesión está ~1min más. Se suman todos los rangos de tiempo, y así se genera el total. Se pueden ver los rangos de tiempo calculados en la página.

Los valores de 3min entre likes y 2min extra por grupo son arbitrarios y relativamente conservadores.
`);
</script>

<main class="prose prose-neutral dark:prose-invert mx-auto px-2 py-7">
  {@html result}
</main>

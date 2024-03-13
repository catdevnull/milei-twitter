<script lang="ts">
  import type { PageData } from "./$types";
  import cloud from "d3-cloud";
  import * as d3 from "d3";
  import { browser } from "$app/environment";

  export let data: PageData;

  const tz = "America/Argentina/Buenos_Aires";
  const weekDayFormatter = Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    weekday: "short",
    timeZone: tz,
  });
  $: words = data.ultimaSemana
    .flatMap((s) => s.tweets)
    .flatMap((s) => s.text?.split(/\s/) ?? [])
    .map(
      (w) =>
        w
          .toLowerCase()
          .trim()
          .replaceAll(/á/gu, "a")
          .replaceAll(/í/gu, "i")
          .replaceAll(/[óó]/gu, "o"),
      // .replaceAll(/[\.“\+\(\)"\!:,\$…👇👉|\p{Emoji}\u200d]+/g, ""),
    )
    // .filter((w) => isNaN(parseInt(w)))
    .filter(
      (w) =>
        // prettier-ignore
        !["10","3","a","aca","agarra","ah","al","ante","asi","bajo","bien","bueno","cabe","cada","claro","como","con","contra","cosa","cosas","creo","cual","cuando","da","de","decir","del","desde","despues","dice","dicen","digo","dijo","donde","dos","durante","eh","el","el","en","entonces","entre","era","es","esa","ese","eso","esos","esta","estamos","estan","estar","estas","este","esto","estoy","fue","fue","gran","ha","hablar","hace","hacer","hacia","han","hasta","hecho","hey","hizo","hoy","ir","la","las","le","les","lo","los","mas","me","me","me","mediante","mejor","mi","mira","momento","mucho","muy","muy","nada","ni","no","nos","o","otra","otro","par","para","pasa","pero","poco","pone","por","porque","puede","puedo","que","quien","quiero","s","se","sea","segun","ser","si","si","si","sido","sin","so","solo","son","sos","soy","su","sus","tal","tambien","tan","tanto","te","tenemos","tenes","tengo","tenia","tiene","tipo","todas","todo","todos","tras","tres","tu","un","un","una","uno","va","van","vas","veces","venir","ver","versus","vez","vi","viste","vos","voy","y","ya","yo",]
        .includes(w),
    );

  $: countedWords = words.reduce((prev, curr) => {
    const word = curr;
    prev.set(word, (prev.get(word) ?? 0) + 1);
    return prev;
  }, new Map<string, number>());
  $: words2 = wordsIntoObject(countedWords);
  function wordsIntoObject(words: Map<string, number>) {
    let objs = [];
    for (const [word, n] of words.entries()) {
      if (n < 5) continue;
      objs.push({
        text: word,
        size: 5 + n * 3,
      });
    }
    console.log(objs.length);
    return objs;
  }

  $: console.debug(words2.slice(0, 1000));

  const size = [960, 500];

  let layout;
  $: {
    layout =
      browser &&
      cloud()
        .size(size)
        .words(words2)
        .padding(5)
        .rotate(() => 0)
        .font("serif")
        .fontSize((d) => d.size)
        .on("end", draw)
        .start();
  }

  function draw(words) {
    d3.select("body")
      .append("svg")
      .attr("width", size[0])
      .attr("height", size[1])
      .append("g")
      .attr("transform", "translate(" + size[0] / 2 + "," + size[1] / 2 + ")")
      .selectAll("text")
      .data(words)
      .enter()
      .append("text")
      .style("font-size", function (d) {
        return d.size + "px";
      })
      .style("font-family", "serif")
      .attr("text-anchor", "middle")
      .attr("transform", function (d) {
        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
      })
      .text(function (d) {
        return d.text;
      });
  }
</script>

<p>
  {words.join(" ")}
</p>

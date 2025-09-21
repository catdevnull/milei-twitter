<script lang="ts">
  export let matrix: number[][]; // 7 x 24, dayjs().day() indexing (0=Sunday)

  const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const hours = Array.from({ length: 24 }, (_, h) => h);

  $: max = Math.max(0, ...matrix.flat());

  function colorFor(value: number) {
    if (max === 0) return "#e5e7eb"; // neutral-200
    const t = value / max;
    // simple sequential palette from light to dark orange
    if (t === 0) return "#f3f4f6"; // neutral-100
    if (t < 0.2) return "#fde7d9";
    if (t < 0.4) return "#fdcdb3";
    if (t < 0.6) return "#fca36b";
    if (t < 0.8) return "#f77f00";
    return "#d65a00";
  }
</script>

<div class="flex w-full flex-col gap-2">
  <div class="overflow-x-auto">
    <div
      class="grid"
      style="grid-template-columns: 48px repeat(24, minmax(20px,1fr));"
    >
      <div></div>
      {#each hours as h}
        <div class="text-center text-[10px] text-muted-foreground">{h}</div>
      {/each}

      {#each matrix as row, dow}
        <div class="sticky left-0 z-10 bg-transparent pr-2 text-right text-xs">
          {weekdays[dow]}
        </div>
        {#each row as value}
          <div
            class="aspect-square border border-neutral-200 dark:border-neutral-700"
            style={`background:${colorFor(value)}`}
            title={`${weekdays[dow]} ${value} interacciones`}
          ></div>
        {/each}
      {/each}
    </div>
  </div>

  <div class="flex items-center gap-2 self-end text-xs text-muted-foreground">
    <span>menos</span>
    <div class="h-3 w-3" style="background:#f3f4f6"></div>
    <div class="h-3 w-3" style="background:#fde7d9"></div>
    <div class="h-3 w-3" style="background:#fdcdb3"></div>
    <div class="h-3 w-3" style="background:#fca36b"></div>
    <div class="h-3 w-3" style="background:#f77f00"></div>
    <div class="h-3 w-3" style="background:#d65a00"></div>
    <span>más</span>
  </div>
</div>

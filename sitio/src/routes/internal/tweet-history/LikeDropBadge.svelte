<script lang="ts">
  import type { LikeDropStats } from "$lib/data-processing/likeDrops";

  export let stats: LikeDropStats;

  const number = new Intl.NumberFormat("es-AR");
  const percent = new Intl.NumberFormat("es-AR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  $: label =
    stats.level === "red"
      ? "Caída fuerte"
      : stats.level === "yellow"
        ? "Caída leve"
        : "Sin caídas";
  $: detail =
    stats.dropEvents === 0
      ? "Los likes nunca bajaron entre snapshots consecutivos."
      : `${stats.dropEvents} ${stats.dropEvents === 1 ? "baja" : "bajas"}; la mayor fue de ${number.format(stats.maxSingleDrop)} likes (${percent.format(stats.maxSingleDropRate)}). Total de likes perdidos: ${number.format(stats.totalLikesLost)}.`;
  $: badgeClass =
    stats.level === "green"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
      : stats.level === "yellow"
        ? "bg-amber-100 text-amber-900 ring-amber-600/20"
        : "bg-red-100 text-red-800 ring-red-600/20";
  $: dotClass =
    stats.level === "green"
      ? "bg-emerald-600"
      : stats.level === "yellow"
        ? "bg-amber-500"
        : "bg-red-600";
</script>

<span
  class={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset dark:bg-opacity-20 ${badgeClass}`}
  title={detail}
  aria-label={`${label}. ${detail}`}
>
  <span class={`h-2 w-2 rounded-full ${dotClass}`}></span>
  {label}
  {#if stats.dropEvents > 0}
    <span class="font-normal">−{number.format(stats.maxSingleDrop)}</span>
  {/if}
</span>

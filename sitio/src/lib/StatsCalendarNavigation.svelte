<script lang="ts">
  import dayjs from "dayjs";
  import { monthFormatter, tz } from "./consts";
  import { dateToMonthString } from "../routes/promedios/[year]/[month]/months";
  import { ArrowLeftIcon, ArrowRightIcon } from "lucide-svelte";
  import Button from "./components/ui/button/button.svelte";

  export let start: Date;
  export let hasNextMonth: boolean;
  export let hideIfNotExists = false;

  $: mesAnterior = dayjs(start).tz(tz).subtract(1, "month");
  $: mesAnteriorHref = `/promedios/${mesAnterior.year()}/${dateToMonthString(mesAnterior)}`;
  $: mesProximo = dayjs(start).tz(tz).add(1, "month");
  $: mesProximoHref = `/promedios/${mesProximo.year()}/${dateToMonthString(mesProximo)}`;
  $: hasPrevMonth = mesAnterior.isAfter(dayjs("2024-01-29"));
</script>

<div class="flex flex-wrap gap-2">
  {#if !hideIfNotExists || hasPrevMonth}
    <Button
      href={hasPrevMonth ? mesAnteriorHref : undefined}
      disabled={!hasPrevMonth}
    >
      <ArrowLeftIcon class="mr-2 size-5" />
      {monthFormatter.format(mesAnterior.toDate())}
    </Button>
  {/if}
  {#if !hideIfNotExists || hasNextMonth}
    <Button
      href={hasNextMonth ? mesProximoHref : undefined}
      disabled={!hasNextMonth}
    >
      {monthFormatter.format(mesProximo.toDate())}
      <ArrowRightIcon class="ml-2 size-5" />
    </Button>
  {/if}
</div>

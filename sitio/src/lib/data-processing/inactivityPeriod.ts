import { dayjs, tz } from "$lib/consts";

export function getInactivityPeriod(params: URLSearchParams, now = new Date()) {
  const today = dayjs(now).tz(tz).format("YYYY-MM-DD");
  const preset = params.get("streakPeriod") ?? "all";
  let from = params.get("streakFrom");
  let to = params.get("streakTo");

  if (from !== null || to !== null) {
    if (!from || !to) throw new Error("Completá ambas fechas.");
  } else {
    const end = dayjs(now).tz(tz);
    switch (preset) {
      case "5y":
        from = end.subtract(5, "year").format("YYYY-MM-DD");
        break;
      case "1y":
        from = end.subtract(1, "year").format("YYYY-MM-DD");
        break;
      case "6m":
        from = end.subtract(6, "month").format("YYYY-MM-DD");
        break;
      case "3m":
        from = end.subtract(3, "month").format("YYYY-MM-DD");
        break;
      case "all":
        from = "2024-02-12";
        break;
      default:
        throw new Error("El período seleccionado no es válido.");
    }
    to = today;
  }

  for (const value of [from, to]) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !dayjs(value, "YYYY-MM-DD", true).isValid()
    ) {
      throw new Error("Ingresá fechas válidas.");
    }
  }
  if (from > to)
    throw new Error(
      "La fecha de inicio debe ser anterior o igual a la de fin.",
    );
  if (to > today) throw new Error("La fecha de fin no puede ser futura.");

  return {
    preset:
      params.has("streakFrom") || params.has("streakTo") ? "custom" : preset,
    from,
    to,
    today,
    start: dayjs.tz(from, tz).startOf("day").toDate(),
    end: new Date(Math.min(+dayjs.tz(to, tz).endOf("day"), +now)),
  };
}

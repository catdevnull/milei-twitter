import { type ClassValue, clsx } from "clsx";
import { readable } from "svelte/store";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const useMediaQuery = (query: string) => {
  if (typeof window === "undefined") {
    return readable(false);
  }
  let matcher = window.matchMedia(query);
  return readable(matcher.matches, (set) => {
    const update = (m: MediaQueryListEvent) => set(m.matches);
    matcher.addEventListener("change", update);
    return () => matcher.removeEventListener("change", update);
  });
};

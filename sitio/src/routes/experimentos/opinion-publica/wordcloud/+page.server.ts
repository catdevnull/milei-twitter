import { loadStuff } from "../queries";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = (x) => loadStuff(x);

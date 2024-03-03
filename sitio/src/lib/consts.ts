export { JMILEI_HANDLE, JMILEI_ID } from "api/consts.ts";

import dayjs, { type Dayjs } from "dayjs";
import CustomParseFormat from "dayjs/plugin/customParseFormat.js";
import Utc from "dayjs/plugin/utc.js";
import Tz from "dayjs/plugin/timezone.js";
dayjs.extend(CustomParseFormat);
dayjs.extend(Utc);
dayjs.extend(Tz);

export { dayjs };
export type { Dayjs };

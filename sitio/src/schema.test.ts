import assert from "assert";
import { decodeIdArray, encodeIdArray } from "./schema";

const origArray = ["1783452934785", "1823479128734", "9487309287"];
const buffer = encodeIdArray(origArray);
const buffer2 = Buffer.from([
  0, 0, 1, 159, 62, 20, 34, 129, 0, 0, 1, 168, 143, 211, 98, 158, 0, 0, 0, 2,
  53, 124, 217, 231,
]);
assert(buffer.equals(buffer2));

const array = decodeIdArray(buffer);
assert(
  array.every((item, index) => origArray[index] === item) &&
    array.length === origArray.length,
);

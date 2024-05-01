import Database from "better-sqlite3";

import dayjs from "dayjs";
import CustomParseFormat from "dayjs/plugin/customParseFormat.js";
import Utc from "dayjs/plugin/utc.js";
import Tz from "dayjs/plugin/timezone.js";
import { join } from "path";
dayjs.extend(CustomParseFormat);
dayjs.extend(Utc);
dayjs.extend(Tz);

const DBS_PATH = process.env.DBS_PATH ?? ".";
const db = new Database(join(DBS_PATH, "memory.db"));

const user_version = /** @type {number} */ (
  db.pragma("user_version", {
    simple: true,
  })
);
console.debug({ user_version });
switch (user_version + 1) {
  case 1:
    db.transaction(() => {
      db.prepare(
        `create table db_already_posted(
      date text not null,
      kind text not null,
      at number not null
    )`
      ).run();
      db.prepare(`pragma user_version=1`).run();
    })();
}

function getToday() {
  return dayjs()
    .tz("America/Argentina/Buenos_Aires", true)
    .format("YYYY-MM-DD");
}

/**
 * @param {string} kind
 */
export async function didPostTodayAlready(kind) {
  const today = getToday();
  const alreadyExists = db
    .prepare(
      `select date from db_already_posted
        where date = ? and kind = ?`
    )
    .get(today, kind);
  return !!alreadyExists;
}

/**
 * @param {string} kind
 */
export async function justPosted(kind) {
  const today = getToday();
  db.prepare(
    `insert into db_already_posted(date, kind, at)
      values(?, ?, ?)`
  ).run(today, kind, +new Date());
}

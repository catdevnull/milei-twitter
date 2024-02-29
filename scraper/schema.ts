import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const scraps = sqliteTable("db_scraper_scraps", {
  uid: text("uid").primaryKey(),
  savedWithid: integer("saved_with_id"),
  json: text("json", { mode: "json" }),
});

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const scraps = sqliteTable("db_scraper_scraps", {
  uid: text("uid").primaryKey(),
  savedWithId: integer("saved_with_id"),
  json: text("json").notNull(),
});

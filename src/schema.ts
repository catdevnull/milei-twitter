import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const likedTweets = sqliteTable("db_liked_tweets", {
  url: text("url").primaryKey(),
  firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).notNull(),
  text: text("text"),
  scrapId: integer("scrap_id"),
});
export const likedTweetsRelations = relations(likedTweets, ({ one, many }) => ({
  scrap: one(scraps, {
    fields: [likedTweets.scrapId],
    references: [scraps.id],
  }),
}));

export type LikedTweet = typeof likedTweets.$inferInsert;

// guardamos esto para detectar si en algun momento tardamos mucho en volver a scrapear y reportamos incorrectamente muchos likes al mismo tiempo
// aunque todavia no está implementado
// TODO: detectar deteccion de gaps en el scrapeo
export const scraps = sqliteTable("db_scraps", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  at: integer("at", { mode: "timestamp" }).notNull(),
});

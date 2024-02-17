import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import z from "zod";

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
  cuentaId: text("cuenta_id"),
  totalTweetsSeen: integer("total_tweets_seen"),
});
export const scrapsRelations = relations(scraps, ({ many }) => ({
  likedTweets: many(likedTweets),
}));

export type Scrap = typeof scraps.$inferInsert;

export const cuentas = sqliteTable("db_cuentas", {
  id: text("id").primaryKey(),
  accountDataJson: text("account_data_json"),
});

export const zTokenAccountData = z.object({
  ct0: z.string(),
  auth_token: z.string(),
});

export type TokenAccountData = z.infer<typeof zTokenAccountData>;

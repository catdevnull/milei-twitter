import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const likedTweets = sqliteTable("db_liked_tweets", {
  url: text("url").primaryKey(),
  firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).notNull(),
  text: text("text"),
});

export type LikedTweet = typeof likedTweets.$inferInsert;

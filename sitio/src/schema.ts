import { relations } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import z from "zod";

export const likedTweets = sqliteTable(
  "db_liked_tweets",
  {
    url: text("url").primaryKey(),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).notNull(),
    text: text("text"),
    scrapId: integer("scrap_id"),
  },
  (likedTweets) => {
    return {
      firstSeenAtIdx: index("first_seen_at_idx").on(likedTweets.firstSeenAt),
    };
  },
);
export const likedTweetsRelations = relations(likedTweets, ({ one, many }) => ({
  scrap: one(scraps, {
    fields: [likedTweets.scrapId],
    references: [scraps.id],
  }),
}));
export const retweets = sqliteTable(
  "db_retweets",
  {
    posterId: text("poster_id").notNull(),
    posterHandle: text("poster_handle"),
    postId: text("post_id").notNull(),

    firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).notNull(),
    retweetAt: integer("retweet_at", { mode: "timestamp" }).notNull(),
    postedAt: integer("posted_at", { mode: "timestamp" }).notNull(),
    text: text("text"),
    scrapId: integer("scrap_id"),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.posterId, table.postId] }),
      retweetAtIdx: index("retweet_at_idx").on(table.retweetAt),
    };
  },
);
export const retweetsRelations = relations(retweets, ({ one, many }) => ({
  scrap: one(scraps, {
    fields: [retweets.scrapId],
    references: [scraps.id],
  }),
}));

export type LikedTweet = typeof likedTweets.$inferInsert;
export type Retweet = typeof retweets.$inferInsert;

export type MiniLikedTweet = { url: string; firstSeenAt: Date };
export type MiniRetweet = {
  posterId: string;
  posterHandle: string | null;
  postId: string;
  retweetAt: Date;
};

// guardamos esto para detectar si en algun momento tardamos mucho en volver a scrapear y reportamos incorrectamente muchos likes al mismo tiempo
// aunque todavia no está implementado
// TODO: detectar deteccion de gaps en el scrapeo
export const scraps = sqliteTable(
  "db_scraps",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    uid: text("uid"),
    finishedAt: integer("at", { mode: "timestamp" }).notNull(),
    cuentaId: text("cuenta_id"),
    totalTweetsSeen: integer("total_tweets_seen"),
  },
  (table) => {
    return {
      finishedAtIdx: index("db_scraps_finished_at_idx").on(table.finishedAt),
    };
  },
);
export const scrapsRelations = relations(scraps, ({ many }) => ({
  likedTweets: many(likedTweets),
  retweets: many(retweets),
}));

export type Scrap = typeof scraps.$inferInsert;

export const cuentas = sqliteTable("db_cuentas", {
  id: text("id").primaryKey(),
  accountDataJson: text("account_data_json"),
});

export type Cuenta = typeof cuentas.$inferInsert;

export const scraperTokens = sqliteTable("db_scraper_tokens", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  token: text("token").notNull(),
});

export const zTokenAccountData = z.object({
  ct0: z.string(),
  auth_token: z.string(),
});

export type TokenAccountData = z.infer<typeof zTokenAccountData>;

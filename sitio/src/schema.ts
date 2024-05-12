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
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
    text: text("text"),
    scrapId: integer("scrap_id"),
  },
  (likedTweets) => {
    return {
      firstSeenAtIdx: index("first_seen_at_idx").on(likedTweets.firstSeenAt),
      likedTweetsLastSeenAtIdx: index("liked_tweets_last_seen_at_idx").on(
        likedTweets.lastSeenAt,
      ),
      likedTweetsScrapIdIdx: index("liked_tweets_scrap_id_idx").on(
        likedTweets.scrapId,
      ),
    };
  },
);
export const likedTweetsRelations = relations(likedTweets, ({ one, many }) => ({
  scrap: one(scraps, {
    fields: [likedTweets.scrapId],
    references: [scraps.id],
  }),
}));

// estos son likes historicos sin timestamp "precisa". vienen de `src/lib/db/historicLikes` y se usan para el chequeador de likes (entre otras cosas?)
// esta tabla se puede droppear y rearmar porque el dataset es el que está incluido en el repo.
export const historicLikedTweets = sqliteTable("db_historic_liked_tweets", {
  postId: text("post_id").primaryKey(),
  url: text("url").notNull(),
  postedAt: integer("posted_at", { mode: "timestamp" }).notNull(),
  estimatedLikedAt: integer("estimated_liked_at", {
    mode: "timestamp",
  }).notNull(),
});

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

export const tweets = sqliteTable("db_tweets", {
  id: text("id").notNull().primaryKey(),
  snscrapeJson: text("snscrape_json", { mode: "json" }).notNull(),
  capturedAt: integer("captured_at", { mode: "timestamp" }).notNull(),
});

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

export type ScraperToken = typeof scraperTokens.$inferInsert;

export const zTokenAccountData = z.object({
  ct0: z.string(),
  auth_token: z.string(),
});

export type TokenAccountData = z.infer<typeof zTokenAccountData>;

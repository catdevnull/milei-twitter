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
  // {"__raw_UNSTABLE":{"bookmark_count":246,"bookmarked":false,"created_at":"Fri Sep 13 23:11:48 +0000 2024","conversation_id_str":"1834731739027067073","display_text_range":[0,270],"entities":{"user_mentions":[],"urls":[],"hashtags":[],"symbols":[]},"favorite_count":22606,"favorited":false,"full_text":"El sueño húmedo de los perisobres argentos. Libertad de expresión sólo para ellos y monopolio del micrófono así pueden mentir, calumniar, injuriar, decir cualquier estupidez sin pensar ni chequear, apretar, chantajear y obviamente extorsionar...\nSe les acabó el curro...","is_quote_status":true,"lang":"es","quote_count":100,"quoted_status_id_str":"1834728769841775038","quoted_status_permalink":{"url":"https://t.co/Tg9884SxYP","expanded":"https://twitter.com/laderechadiario/status/1834728769841775038","display":"x.com/laderechadiari…"},"reply_count":1138,"retweet_count":4787,"retweeted":false,"user_id_str":"4020276615","id_str":"1834731739027067073"},"bookmarkCount":246,"conversationId":"1834731739027067073","id":"1834731739027067073","hashtags":[],"likes":22606,"mentions":[],"name":"Javier Milei","permanentUrl":"https://twitter.com/JMilei/status/1834731739027067073","photos":[],"replies":1138,"retweets":4787,"text":"El sueño húmedo de los perisobres argentos. Libertad de expresión sólo para ellos y monopolio del micrófono así pueden mentir, calumniar, injuriar, decir cualquier estupidez sin pensar ni chequear, apretar, chantajear y obviamente extorsionar...\nSe les acabó el curro...","thread":[],"urls":[],"userId":"4020276615","username":"JMilei","videos":[],"isQuoted":true,"isReply":false,"isEdited":false,"versions":["1834731739027067073"],"isRetweet":false,"isPin":false,"sensitiveContent":false,"timeParsed":"2024-09-13T23:11:48.000Z","timestamp":1726269108,"quotedStatusId":"1834728769841775038","html":"El sueño húmedo de los perisobres argentos. Libertad de expresión sólo para ellos y monopolio del micrófono así pueden mentir, calumniar, injuriar, decir cualquier estupidez sin pensar ni chequear, apretar, chantajear y obviamente extorsionar...<br>Se les acabó el curro...","views":436391,"quotedStatus":{"__raw_UNSTABLE":{"bookmark_count":77,"bookmarked":false,"created_at":"Fri Sep 13 23:00:00 +0000 2024","conversation_id_str":"1834728769841775038","display_text_range":[0,108],"entities":{"user_mentions":[],"urls":[{"display_url":"derechadiario.com.ar/politica/austr…","expanded_url":"https://derechadiario.com.ar/politica/australia-amenazo-con-multar-las-redes-sociales-que-no-censuren-derecha","url":"https://t.co/ttFOh0XGu2","indices":[85,108]}],"hashtags":[],"symbols":[]},"favorite_count":2692,"favorited":false,"full_text":"🇦🇺 | Australia amenazó con multar a las redes sociales que no censuren a la derecha.\nhttps://t.co/ttFOh0XGu2","is_quote_status":false,"lang":"es","possibly_sensitive":false,"possibly_sensitive_editable":true,"quote_count":67,"reply_count":137,"retweet_count":565,"retweeted":false,"user_id_str":"1169664359628509184","id_str":"1834728769841775038"},"bookmarkCount":77,"conversationId":"1834728769841775038","id":"1834728769841775038","hashtags":[],"likes":2692,"mentions":[],"name":"La Derecha Diario","permanentUrl":"https://twitter.com/laderechadiario/status/1834728769841775038","photos":[],"replies":137,"retweets":565,"text":"🇦🇺 | Australia amenazó con multar a las redes sociales que no censuren a la derecha.\nhttps://t.co/ttFOh0XGu2","thread":[],"urls":["https://derechadiario.com.ar/politica/australia-amenazo-con-multar-las-redes-sociales-que-no-censuren-derecha"],"userId":"1169664359628509184","username":"laderechadiario","videos":[],"isQuoted":false,"isReply":false,"isEdited":false,"versions":["1834728769841775038"],"isRetweet":false,"isPin":false,"sensitiveContent":false,"timeParsed":"2024-09-13T23:00:00.000Z","timestamp":1726268400,"html":"🇦🇺 | Australia amenazó con multar a las redes sociales que no censuren a la derecha.<br><a href=\"https://derechadiario.com.ar/politica/australia-amenazo-con-multar-las-redes-sociales-que-no-censuren-derecha\">https://t.co/ttFOh0XGu2</a>","views":531017}}
  twitterScraperJson: text("twitter_scraper_json", { mode: "json" }).notNull(),
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
export type MiniTweet = {
  timestamp: Date;
  isRetweet: boolean;
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

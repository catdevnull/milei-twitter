CREATE TABLE IF NOT EXISTS "db_cuentas" (
	"id" text PRIMARY KEY NOT NULL,
	"account_data_json" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "db_historic_liked_tweets" (
	"post_id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"estimated_liked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "db_liked_tweets" (
	"url" text PRIMARY KEY NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone,
	"text" text,
	"scrap_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "db_retweets" (
	"poster_id" text NOT NULL,
	"poster_handle" text,
	"post_id" text NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"retweet_at" timestamp with time zone NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"text" text,
	"scrap_id" integer,
	CONSTRAINT "db_retweets_poster_id_post_id_pk" PRIMARY KEY("poster_id","post_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "db_scraper_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "db_scraps" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text,
	"at" timestamp with time zone NOT NULL,
	"cuenta_id" text,
	"total_tweets_seen" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "db_tweets" (
	"id" text PRIMARY KEY NOT NULL,
	"twitter_scraper_json" jsonb NOT NULL,
	"captured_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "first_seen_at_idx" ON "db_liked_tweets" USING btree ("first_seen_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "liked_tweets_last_seen_at_idx" ON "db_liked_tweets" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "liked_tweets_scrap_id_idx" ON "db_liked_tweets" USING btree ("scrap_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retweet_at_idx" ON "db_retweets" USING btree ("retweet_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "db_scraps_finished_at_idx" ON "db_scraps" USING btree ("at");
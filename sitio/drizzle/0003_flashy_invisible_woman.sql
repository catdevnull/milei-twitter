CREATE TABLE IF NOT EXISTS "db_tweet_snapshots" (
	"tweet_id" text NOT NULL,
	"scraped_at" timestamp with time zone NOT NULL,
	"tweeted_at" timestamp with time zone NOT NULL,
	"favorite_count" bigint NOT NULL,
	"views_count" bigint,
	"tweet_json" jsonb NOT NULL,
	CONSTRAINT "db_tweet_snapshots_tweet_id_scraped_at_pk" PRIMARY KEY("tweet_id","scraped_at")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "db_tweet_snapshots_tweeted_at_idx" ON "db_tweet_snapshots" USING btree ("tweeted_at");
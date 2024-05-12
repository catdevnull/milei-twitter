ALTER TABLE db_liked_tweets ADD `last_seen_at` integer;--> statement-breakpoint
CREATE INDEX `liked_tweets_last_seen_at_idx` ON `db_liked_tweets` (`last_seen_at`);
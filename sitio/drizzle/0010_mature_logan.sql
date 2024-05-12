CREATE TABLE `db_scraper_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `db_tweets` (
	`id` text PRIMARY KEY NOT NULL,
	`snscrape_json` text NOT NULL,
	`captured_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE db_scraps ADD `uid` text;--> statement-breakpoint
CREATE INDEX `liked_tweets_scrap_id_idx` ON `db_liked_tweets` (`scrap_id`);--> statement-breakpoint
CREATE INDEX `db_scraps_finished_at_idx` ON `db_scraps` (`at`);
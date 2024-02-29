CREATE TABLE `db_scraper_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE db_scraps ADD `uid` text;
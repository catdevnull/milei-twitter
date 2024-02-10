CREATE TABLE `db_scraps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE db_liked_tweets ADD `scrap_id` integer;
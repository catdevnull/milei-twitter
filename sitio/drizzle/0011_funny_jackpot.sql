CREATE TABLE `db_tweets` (
	`id` text PRIMARY KEY NOT NULL,
	`snscrape_json` text NOT NULL,
	`captured_at` integer NOT NULL
);

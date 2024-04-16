CREATE TABLE IF NOT EXISTS `db_historic_liked_tweets` (
	`post_id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`posted_at` integer NOT NULL,
	`estimated_liked_at` integer NOT NULL
);

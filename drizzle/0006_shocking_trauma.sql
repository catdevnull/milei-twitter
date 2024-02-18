CREATE TABLE `db_retweets` (
	`url` text PRIMARY KEY NOT NULL,
	`first_seen_at` integer NOT NULL,
	`retweet_at` integer NOT NULL,
	`posted_at` integer NOT NULL,
	`text` text,
	`scrap_id` integer
);

CREATE TABLE `db_retweets` (
	`poster_id` text NOT NULL,
	`poster_handle` text,
	`first_seen_at` integer NOT NULL,
	`retweet_at` integer NOT NULL,
	`posted_at` integer NOT NULL,
	`text` text,
	`scrap_id` integer,
	PRIMARY KEY(`poster_id`, `poster_id`)
);

CREATE TABLE `db_twitter_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text,
	`password` text,
	`email` text,
	`email_password` text,
	`two_factor_secret` text,
	`last_failed_at` integer,
	`cookies_json` text
);

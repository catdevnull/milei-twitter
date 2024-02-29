CREATE TABLE `db_scraper_scraps` (
	`uid` text PRIMARY KEY NOT NULL,
	`saved_with_id` integer,
	`json` text NOT NULL
);

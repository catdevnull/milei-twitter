DROP TABLE `db_following_lists`;--> statement-breakpoint
ALTER TABLE `db_tweets` ADD `twitter_scraper_json` text NOT NULL;--> statement-breakpoint
ALTER TABLE `db_tweets` DROP COLUMN `snscrape_json`;
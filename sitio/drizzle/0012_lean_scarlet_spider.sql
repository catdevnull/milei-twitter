CREATE TABLE `db_following_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`captured_at` integer NOT NULL,
	`user_id` text NOT NULL,
	`following_ids_buffer` blob
);
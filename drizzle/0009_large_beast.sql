ALTER TABLE `focus_sessions` ADD `category_id` text REFERENCES categories(id);--> statement-breakpoint
CREATE INDEX `focus_sessions_category_idx` ON `focus_sessions` (`category_id`);
CREATE TABLE `gym_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`exercises` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gym_sessions_user_idx` ON `gym_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `gym_sessions_user_date_idx` ON `gym_sessions` (`user_id`,`date`);
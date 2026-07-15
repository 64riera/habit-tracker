CREATE TABLE `gym_routines` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`exercises` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gym_routines_user_idx` ON `gym_routines` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `gym_routines_user_name_idx` ON `gym_routines` (`user_id`,`name`);
CREATE TABLE `gym_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name_es` text NOT NULL,
	`name_en` text NOT NULL,
	`muscle_group` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gym_exercises_user_idx` ON `gym_exercises` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `gym_exercises_user_name_idx` ON `gym_exercises` (`user_id`,`name_es`);--> statement-breakpoint
-- Exercise names moved from free text to a catalog reference (exerciseId):
-- existing sessions' `exercises` JSON is in the old incompatible shape, and
-- the user confirmed it's fine to drop it rather than write a one-off
-- migration for data that was only ever test/early usage.
DELETE FROM `gym_sessions`;
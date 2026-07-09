DROP INDEX "achievements_user_idx";--> statement-breakpoint
DROP INDEX "categories_user_idx";--> statement-breakpoint
DROP INDEX "habit_logs_habit_date_idx";--> statement-breakpoint
DROP INDEX "habit_logs_date_idx";--> statement-breakpoint
DROP INDEX "habit_logs_user_idx";--> statement-breakpoint
DROP INDEX "habits_user_idx";--> statement-breakpoint
DROP INDEX "habits_status_idx";--> statement-breakpoint
DROP INDEX "routines_user_idx";--> statement-breakpoint
DROP INDEX "users_username_idx";--> statement-breakpoint
ALTER TABLE `users` ALTER COLUMN "password_hash" TO "password_hash" text;--> statement-breakpoint
ALTER TABLE `users` ADD `email` text;--> statement-breakpoint
ALTER TABLE `users` ADD `google_id` text;--> statement-breakpoint
CREATE INDEX `achievements_user_idx` ON `achievements` (`user_id`);--> statement-breakpoint
CREATE INDEX `categories_user_idx` ON `categories` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `habit_logs_habit_date_idx` ON `habit_logs` (`habit_id`,`date`);--> statement-breakpoint
CREATE INDEX `habit_logs_date_idx` ON `habit_logs` (`date`);--> statement-breakpoint
CREATE INDEX `habit_logs_user_idx` ON `habit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `habits_user_idx` ON `habits` (`user_id`);--> statement-breakpoint
CREATE INDEX `habits_status_idx` ON `habits` (`status`);--> statement-breakpoint
CREATE INDEX `routines_user_idx` ON `routines` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_idx` ON `users` (`google_id`);
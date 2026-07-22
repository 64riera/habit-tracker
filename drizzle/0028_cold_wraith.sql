ALTER TABLE `gym_sessions` ADD `status` text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE `gym_sessions` ADD `draft_date` text;--> statement-breakpoint
ALTER TABLE `gym_sessions` ADD `draft_exercises` text;--> statement-breakpoint
ALTER TABLE `gym_sessions` ADD `draft_saved_at` text;
CREATE TABLE `focus_reward_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tier` text NOT NULL,
	`unlocked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `focus_reward_tiers_user_tier_idx` ON `focus_reward_tiers` (`user_id`,`tier`);--> statement-breakpoint
CREATE INDEX `focus_reward_tiers_user_idx` ON `focus_reward_tiers` (`user_id`);--> statement-breakpoint
CREATE TABLE `focus_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`habit_id` text,
	`mode` text NOT NULL,
	`planned_duration_seconds` integer,
	`status` text DEFAULT 'running' NOT NULL,
	`started_at` text NOT NULL,
	`last_resumed_at` text NOT NULL,
	`accumulated_active_seconds` integer DEFAULT 0 NOT NULL,
	`breaks_enabled` integer DEFAULT false NOT NULL,
	`break_interval_minutes` integer,
	`break_duration_minutes` integer,
	`breaks_taken_count` integer DEFAULT 0 NOT NULL,
	`break_started_at` text,
	`paused_at` text,
	`completed_at` text,
	`auto_completed` integer DEFAULT false NOT NULL,
	`date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `focus_sessions_user_idx` ON `focus_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `focus_sessions_user_status_idx` ON `focus_sessions` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `focus_sessions_date_idx` ON `focus_sessions` (`date`);--> statement-breakpoint
CREATE INDEX `focus_sessions_habit_idx` ON `focus_sessions` (`habit_id`);--> statement-breakpoint
CREATE TABLE `focus_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`daily_goal_minutes` integer DEFAULT 60 NOT NULL,
	`default_mode` text DEFAULT 'countdown' NOT NULL,
	`default_duration_minutes` integer DEFAULT 25 NOT NULL,
	`breaks_enabled` integer DEFAULT false NOT NULL,
	`break_interval_minutes` integer DEFAULT 25 NOT NULL,
	`break_duration_minutes` integer DEFAULT 5 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

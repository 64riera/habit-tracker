CREATE TABLE `metronome_timers` (
	`user_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`duration_seconds` integer NOT NULL,
	`started_at` text NOT NULL,
	`last_resumed_at` text NOT NULL,
	`accumulated_active_seconds` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `users` ADD `metronome_bpm` integer DEFAULT 120 NOT NULL;
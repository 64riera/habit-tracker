CREATE TABLE `recurring_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`category_id` text,
	`amount` real NOT NULL,
	`note` text,
	`recurrence_type` text NOT NULL,
	`day_of_month` integer NOT NULL,
	`month` integer,
	`start_date` text NOT NULL,
	`last_generated_date` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `finance_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `recurring_transactions_user_idx` ON `recurring_transactions` (`user_id`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `recurring_transaction_id` text REFERENCES recurring_transactions(id);
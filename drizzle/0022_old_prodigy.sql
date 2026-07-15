CREATE TABLE `finance_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text NOT NULL,
	`monthly_limit` real NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `finance_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `finance_budgets_user_idx` ON `finance_budgets` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `finance_budgets_user_category_idx` ON `finance_budgets` (`user_id`,`category_id`);
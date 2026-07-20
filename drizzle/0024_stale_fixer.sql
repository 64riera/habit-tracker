-- SQLite refuses `ALTER TABLE ... ADD COLUMN` with a NOT NULL constraint
-- and a non-constant default (CURRENT_TIMESTAMP) on a table that already
-- has rows ("Cannot add a column with non-constant default"). Added
-- nullable instead and backfilled from `created_at`, which is a real value
-- for every existing row — app code (lib/actions/gym.ts) always supplies
-- an explicit `updated_at` on every insert/update going forward, so no row
-- is ever left null in practice even though SQLite itself won't enforce it.
ALTER TABLE `gym_sessions` ADD `updated_at` text;--> statement-breakpoint
UPDATE `gym_sessions` SET `updated_at` = `created_at` WHERE `updated_at` IS NULL;

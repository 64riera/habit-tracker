-- Removes any duplicate unlock rows from before this fix (see
-- lib/habits/log-write.ts's onConflictDoNothing) so the unique index below
-- can actually be created — a UNIQUE index creation fails outright if the
-- table already has conflicting rows. Keeps the earliest row per
-- (user_id, habit_id, type), matching whichever unlock actually happened first.
DELETE FROM achievements
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM achievements GROUP BY user_id, habit_id, type
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievements_user_habit_type_idx` ON `achievements` (`user_id`,`habit_id`,`type`);
-- Repoint any transaction pointing at a category that will be dropped below
-- as a duplicate, to the surviving row for the same (user_id, name_es).
UPDATE transactions
SET category_id = (
  SELECT MIN(fc2.id) FROM finance_categories fc2
  WHERE fc2.user_id = (SELECT user_id FROM finance_categories WHERE id = transactions.category_id)
    AND fc2.name_es = (SELECT name_es FROM finance_categories WHERE id = transactions.category_id)
)
WHERE category_id IN (
  SELECT fc.id FROM finance_categories fc
  WHERE fc.id <> (
    SELECT MIN(fc3.id) FROM finance_categories fc3
    WHERE fc3.user_id = fc.user_id AND fc3.name_es = fc.name_es
  )
);
--> statement-breakpoint
-- Categories are meant to be a fixed canonical set per account, seeded once
-- (see lib/finance/canonical-categories.ts); a race in the self-healing
-- backfill (getFinanceCategories() being called twice concurrently) could
-- double-insert the same category. Keep the earliest-id row per
-- (user_id, name_es) group and drop the rest.
DELETE FROM finance_categories
WHERE id NOT IN (
  SELECT MIN(id) FROM finance_categories GROUP BY user_id, name_es
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_categories_user_name_idx` ON `finance_categories` (`user_id`,`name_es`);
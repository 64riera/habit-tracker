-- Repoints any habit pointing at a duplicate category (same user_id +
-- name_es, created by a race in the old getCategories() self-heal, which
-- had no unique constraint to stop it) onto the row being kept below —
-- otherwise deleting the duplicate would leave that habit's category_id
-- dangling.
UPDATE habits
SET category_id = (
  SELECT MIN(c2.id) FROM categories c2
  WHERE c2.user_id = (SELECT user_id FROM categories WHERE id = habits.category_id)
    AND c2.name_es = (SELECT name_es FROM categories WHERE id = habits.category_id)
)
WHERE category_id IN (
  SELECT c1.id FROM categories c1
  WHERE c1.id != (
    SELECT MIN(c2.id) FROM categories c2 WHERE c2.user_id = c1.user_id AND c2.name_es = c1.name_es
  )
);
--> statement-breakpoint
-- Keeps the lowest-id row per (user_id, name_es), removes the rest — the
-- unique index below would otherwise fail to create on any account that
-- already has a duplicate.
DELETE FROM categories
WHERE id NOT IN (
  SELECT MIN(id) FROM categories GROUP BY user_id, name_es
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_user_name_idx` ON `categories` (`user_id`,`name_es`);

import { eq } from "drizzle-orm";
import type { AnySQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "./client";

/** Next `sortOrder` for a new row scoped to `userId` — one past the current max, so it stays
 * correct after rows have been deleted (unlike a plain row count, which can collide with an
 * existing sortOrder once the sequence has gaps). */
export async function nextSortOrder(
  table: SQLiteTable,
  sortOrderColumn: AnySQLiteColumn<{ data: number }>,
  userIdColumn: AnySQLiteColumn<{ data: string }>,
  userId: string
): Promise<number> {
  const rows = await db.select({ sortOrder: sortOrderColumn }).from(table).where(eq(userIdColumn, userId));
  return rows.reduce((max, r) => Math.max(max, r.sortOrder ?? 0), -1) + 1;
}

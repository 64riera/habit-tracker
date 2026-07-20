import { and, eq } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

/** WHERE clause scoping a row to its owner — `idColumn === id AND userIdColumn === userId` —
 * the ownership check repeated before nearly every update/delete in lib/actions/*. */
export function ownedWhere(
  idColumn: AnySQLiteColumn,
  id: string,
  userIdColumn: AnySQLiteColumn<{ data: string }>,
  userId: string
) {
  return and(eq(idColumn, id), eq(userIdColumn, userId));
}

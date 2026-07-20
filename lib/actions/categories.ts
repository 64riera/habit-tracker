"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { ownedWhere } from "@/lib/db/owned-where";

// Not wired to realtime (see lib/realtime/domain.ts) — Categories isn't
// one of the three domains where an instant cross-device push earns its
// cost; it still catches up the normal way on reconnect/focus/manual sync.
function revalidateCategoriesPaths() {
  revalidatePath("/habits");
  revalidatePath("/habits/categories");
  revalidatePath("/focus");
}

/** Categories are a fixed set (see lib/habits/canonical-categories.ts) —
 * this is the only mutation left: hide/show, never create/edit/delete. */
export async function setCategoryHidden(categoryId: string, hidden: boolean): Promise<void> {
  const userId = await getCurrentUserId();
  await db
    .update(categories)
    .set({ hidden })
    .where(ownedWhere(categories.id, categoryId, categories.userId, userId));

  revalidateCategoriesPaths();
}

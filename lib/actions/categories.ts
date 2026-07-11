"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";

/** Categories are a fixed set (see lib/habits/canonical-categories.ts) —
 * this is the only mutation left: hide/show, never create/edit/delete. */
export async function setCategoryHidden(categoryId: string, hidden: boolean): Promise<void> {
  const userId = await getCurrentUserId();
  await db
    .update(categories)
    .set({ hidden })
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));

  revalidatePath("/habits");
  revalidatePath("/habits/categories");
  revalidatePath("/focus");
}

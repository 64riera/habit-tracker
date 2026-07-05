"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { categories, habits } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { categorySchema, extractCategoryFields } from "@/lib/validation/category";

export type CategoryFormState = { error?: string };

export async function createCategory(
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "invalid" };
  const result = await createCategoryCore(id, extractCategoryFields(formData));
  if (result.error) return result;
  redirect("/habitos/categorias");
}

export async function createCategoryCore(id: string, rawValues: unknown): Promise<CategoryFormState> {
  const parsed = categorySchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();
  const count = (await db.select().from(categories).where(eq(categories.userId, userId))).length;

  // onConflictDoNothing: idempotente si el replay offline se reintenta tras un
  // drenado interrumpido entre el insert y el retiro de la mutación de la cola.
  await db
    .insert(categories)
    .values({
      id,
      userId,
      nameEs: values.nameEs,
      nameEn: values.nameEn,
      color: values.color,
      icon: values.icon || "●",
      sortOrder: count,
    })
    .onConflictDoNothing({ target: categories.id });

  revalidatePath("/habitos");
  revalidatePath("/habitos/categorias");
  return {};
}

export async function updateCategory(
  categoryId: string,
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const result = await updateCategoryCore(categoryId, extractCategoryFields(formData));
  if (result.error) return result;
  redirect("/habitos/categorias");
}

export async function updateCategoryCore(
  categoryId: string,
  rawValues: unknown
): Promise<CategoryFormState> {
  const parsed = categorySchema.safeParse(rawValues);
  if (!parsed.success) return { error: "invalid" };
  const values = parsed.data;
  const userId = await getCurrentUserId();

  await db
    .update(categories)
    .set({
      nameEs: values.nameEs,
      nameEn: values.nameEn,
      color: values.color,
      icon: values.icon || "●",
    })
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));

  revalidatePath("/habitos");
  revalidatePath("/habitos/categorias");
  return {};
}

/** Ruta online: escribe vía el core y redirige. El replay offline usa `deleteCategoryCore` directo. */
export async function deleteCategory(categoryId: string): Promise<void> {
  await deleteCategoryCore(categoryId);
  redirect("/habitos/categorias");
}

export async function deleteCategoryCore(categoryId: string): Promise<void> {
  const userId = await getCurrentUserId();
  await db
    .update(habits)
    .set({ categoryId: null })
    .where(and(eq(habits.categoryId, categoryId), eq(habits.userId, userId)));
  await db.delete(categories).where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));

  revalidatePath("/habitos");
  revalidatePath("/habitos/categorias");
}

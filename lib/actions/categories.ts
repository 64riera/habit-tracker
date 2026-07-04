"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { categories, habits } from "@/lib/db/schema";
import { z } from "zod";

const categorySchema = z.object({
  nameEs: z.string().trim().min(1).max(40),
  nameEn: z.string().trim().min(1).max(40),
  color: z.string().trim().min(1),
  icon: z.string().trim().max(4).optional().or(z.literal("")),
});

export async function createCategory(formData: FormData) {
  const values = categorySchema.parse({
    nameEs: formData.get("nameEs"),
    nameEn: formData.get("nameEn"),
    color: formData.get("color"),
    icon: formData.get("icon") ?? "",
  });

  const count = (await db.select().from(categories)).length;

  await db.insert(categories).values({
    id: nanoid(),
    nameEs: values.nameEs,
    nameEn: values.nameEn,
    color: values.color,
    icon: values.icon || "●",
    sortOrder: count,
  });

  revalidatePath("/habitos");
  revalidatePath("/habitos/categorias");
  redirect("/habitos/categorias");
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const values = categorySchema.parse({
    nameEs: formData.get("nameEs"),
    nameEn: formData.get("nameEn"),
    color: formData.get("color"),
    icon: formData.get("icon") ?? "",
  });

  await db
    .update(categories)
    .set({
      nameEs: values.nameEs,
      nameEn: values.nameEn,
      color: values.color,
      icon: values.icon || "●",
    })
    .where(eq(categories.id, categoryId));

  revalidatePath("/habitos");
  revalidatePath("/habitos/categorias");
  redirect("/habitos/categorias");
}

export async function deleteCategory(categoryId: string) {
  await db.update(habits).set({ categoryId: null }).where(eq(habits.categoryId, categoryId));
  await db.delete(categories).where(eq(categories.id, categoryId));

  revalidatePath("/habitos");
  revalidatePath("/habitos/categorias");
  redirect("/habitos/categorias");
}

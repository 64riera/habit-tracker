"use server";

import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { routines } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import { z } from "zod";

const routineSchema = z.object({
  name: z.string().trim().min(1).max(60),
  habitIds: z.array(z.string()).min(1),
});

export async function createRoutine(formData: FormData) {
  const values = routineSchema.parse({
    name: formData.get("name"),
    habitIds: formData.getAll("habitIds"),
  });

  const userId = await getCurrentUserId();
  const count = (await db.select().from(routines).where(eq(routines.userId, userId))).length;

  await db.insert(routines).values({
    id: nanoid(),
    userId,
    name: values.name,
    habitIds: JSON.stringify(values.habitIds),
    sortOrder: count,
  });

  revalidatePath("/");
  revalidatePath("/habitos/rutinas");
  redirect("/habitos/rutinas");
}

export async function updateRoutine(routineId: string, formData: FormData) {
  const values = routineSchema.parse({
    name: formData.get("name"),
    habitIds: formData.getAll("habitIds"),
  });

  const userId = await getCurrentUserId();
  await db
    .update(routines)
    .set({ name: values.name, habitIds: JSON.stringify(values.habitIds) })
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)));

  revalidatePath("/");
  revalidatePath("/habitos/rutinas");
  redirect("/habitos/rutinas");
}

export async function deleteRoutine(routineId: string) {
  const userId = await getCurrentUserId();
  await db.delete(routines).where(and(eq(routines.id, routineId), eq(routines.userId, userId)));

  revalidatePath("/");
  revalidatePath("/habitos/rutinas");
  redirect("/habitos/rutinas");
}

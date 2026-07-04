"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { routines } from "@/lib/db/schema";
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

  const count = (await db.select().from(routines)).length;

  await db.insert(routines).values({
    id: nanoid(),
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

  await db
    .update(routines)
    .set({ name: values.name, habitIds: JSON.stringify(values.habitIds) })
    .where(eq(routines.id, routineId));

  revalidatePath("/");
  revalidatePath("/habitos/rutinas");
  redirect("/habitos/rutinas");
}

export async function deleteRoutine(routineId: string) {
  await db.delete(routines).where(eq(routines.id, routineId));

  revalidatePath("/");
  revalidatePath("/habitos/rutinas");
  redirect("/habitos/rutinas");
}

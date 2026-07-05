import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentUserIdOrNull } from "@/lib/auth/session";

export type ThemePreference = "light" | "dark" | "system";

/** Preferencia de tema guardada en la cuenta. "system" si no hay sesion (p. ej. /login). */
export async function getThemePreference(): Promise<ThemePreference> {
  const userId = await getCurrentUserIdOrNull();
  if (!userId) return "system";
  const [user] = await db
    .select({ themePreference: users.themePreference })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.themePreference ?? "system";
}

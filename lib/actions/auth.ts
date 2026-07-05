"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { categories, users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, destroySessionCookie, safeNextPath } from "@/lib/auth/session";

export type AuthState = { error?: string };

const USERNAME_PATTERN = /^[a-z0-9_.-]+$/;

const DEFAULT_CATEGORIES = [
  { nameEs: "Creatividad", nameEn: "Creativity", color: "var(--color-cat-creatividad)", icon: "🎨" },
  { nameEs: "Fitness", nameEn: "Fitness", color: "var(--color-cat-fitness)", icon: "💪" },
  { nameEs: "Aprendizaje", nameEn: "Learning", color: "var(--color-cat-aprendizaje)", icon: "🧠" },
  { nameEs: "Estudio", nameEn: "Study", color: "var(--color-cat-estudio)", icon: "📚" },
  { nameEs: "Bienestar", nameEn: "Wellness", color: "var(--color-cat-bienestar)", icon: "🧘" },
];

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function signup(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (username.length < 3 || username.length > 30 || !USERNAME_PATTERN.test(username)) {
    return { error: "usernameInvalid" };
  }
  if (password.length < 8) {
    return { error: "passwordTooShort" };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing) {
    return { error: "usernameTaken" };
  }

  const userId = nanoid();
  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ id: userId, username, passwordHash });

  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((c, i) => ({
      id: nanoid(),
      userId,
      nameEs: c.nameEs,
      nameEn: c.nameEn,
      color: c.color,
      icon: c.icon,
      sortOrder: i,
    }))
  );

  await createSessionCookie(userId);
  redirect(safeNextPath(next));
}

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "invalidCredentials" };
  }

  await createSessionCookie(user.id);
  redirect(safeNextPath(next));
}

export async function logout() {
  await destroySessionCookie();
  redirect("/login");
}

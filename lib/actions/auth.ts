"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { categories, users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, safeNextPath } from "@/lib/auth/session";
import { getPreAuthLocaleCookie, resolvePreAuthLocale } from "@/lib/i18n/locale";
import { isGoogleAuthEnabled } from "@/lib/auth/google";

/** `redirectTo` en vez de `redirect()` de next/navigation: login/signup
 * cambian qué cuenta está activa, y con ella el idioma que debe mostrarse
 * (preferencia de la cuenta en vez de lo detectado del dispositivo). El
 * layout raíz — donde vive `I18nProvider` — es compartido por toda la app,
 * así que una navegación *suave* del router de Next puede reutilizar esa
 * parte del árbol tal como estaba antes de iniciar sesión. Devolver la URL
 * de destino y dejar que el formulario haga `window.location.href` fuerza
 * una recarga real del documento, sin depender de que el router decida
 * refrescar el layout compartido. */
export type AuthState = { error?: string; redirectTo?: string };

const USERNAME_PATTERN = /^[a-z0-9_.-]+$/;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;

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

export async function seedDefaultCategories(userId: string): Promise<void> {
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
}

/** Sincroniza la elección explícita del selector pre-auth (login/signup) a
 * la cuenta que acaba de autenticarse. Solo actúa si el usuario realmente
 * tocó el selector en esta visita (cookie presente) — si no, se respeta la
 * preferencia ya guardada en la cuenta en vez de pisarla con una detección
 * de dispositivo que podría no reflejarla (p. ej. iniciar sesión desde un
 * navegador con otro idioma configurado). */
export async function syncLocalePreferenceOnLogin(userId: string): Promise<void> {
  const explicit = await getPreAuthLocaleCookie();
  if (explicit) {
    await db.update(users).set({ localePreference: explicit }).where(eq(users.id, userId));
  }
}

/** El layout raíz (donde vive `I18nProvider`) se comparte entre todas las
 * rutas, así que el router del cliente lo reutiliza entre navegaciones
 * suaves en vez de volver a pedirlo — sin esto, el idioma que trae una
 * sesión recién creada/cerrada podía tardar en reflejarse porque el
 * cliente seguía usando el locale calculado en la carga anterior.
 * `revalidatePath("/", "layout")` purga ese caché por completo, así la
 * navegación que sigue al login/signup/logout siempre trae el locale
 * fresco (cuenta si hay sesión, dispositivo si no — ver getCurrentLocale). */
export async function invalidateLocaleAcrossApp(): Promise<void> {
  revalidatePath("/", "layout");
}

/** Deriva un username disponible a partir de un email (cuentas creadas vía Google, sin username elegido a mano). */
export async function generateUniqueUsernameFromEmail(email: string): Promise<string> {
  const base = normalizeUsername(email.split("@")[0] ?? "")
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
  const padded = base.length < USERNAME_MIN_LENGTH ? `user${base}` : base;

  for (let attempt = 0; ; attempt++) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const candidate = `${padded.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
}

export async function signup(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  // Defensa en profundidad: el form ya oculta estos campos cuando Google
  // está configurado, pero el Server Action también debe rechazar un POST
  // directo (curl, devtools) en vez de confiar solo en la UI.
  if (isGoogleAuthEnabled()) {
    return { error: "manualAuthDisabled" };
  }

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
  const localePreference = await resolvePreAuthLocale();
  await db.insert(users).values({ id: userId, username, passwordHash, localePreference });
  await seedDefaultCategories(userId);

  await createSessionCookie(userId);
  await invalidateLocaleAcrossApp();
  return { redirectTo: safeNextPath(next) };
}

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  // Ver comentario equivalente en signup().
  if (isGoogleAuthEnabled()) {
    return { error: "manualAuthDisabled" };
  }

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "invalidCredentials" };
  }

  await syncLocalePreferenceOnLogin(user.id);
  await createSessionCookie(user.id);
  await invalidateLocaleAcrossApp();
  return { redirectTo: safeNextPath(next) };
}

// Cerrar sesión NO es un Server Action (ver app/api/auth/logout/route.ts):
// Next siempre vuelve a pedir la pantalla actual después de cualquier
// Server Action, y esa pantalla (Ajustes) recién se quedó sin la sesión
// que sus propios datos asumen. Un POST normal a un Route Handler evita
// ese refresco automático — el navegador solo sigue el redirect.

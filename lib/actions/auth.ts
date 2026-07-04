"use server";

import { redirect } from "next/navigation";
import { createSessionCookie, destroySessionCookie } from "@/lib/auth/session";

export type LoginState = { error?: string };

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const pin = String(formData.get("pin") ?? "");
  const next = String(formData.get("next") ?? "/");
  const expected = process.env.APP_PASSWORD;

  if (!expected || pin !== expected) {
    return { error: "PIN incorrecto / Incorrect PIN" };
  }

  await createSessionCookie();
  redirect(next.startsWith("/") ? next : "/");
}

export async function logout() {
  await destroySessionCookie();
  redirect("/login");
}

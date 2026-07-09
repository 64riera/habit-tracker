import { redirect } from "next/navigation";
import { destroySessionCookie } from "@/lib/auth/session";

/**
 * Route Handler en vez de Server Action: cerrar sesión desde una pantalla
 * autenticada (Ajustes) y luego volver a pedirle a esa misma pantalla que
 * se re-renderice —el refresco automático que Next hace después de toda
 * Server Action— rompe, porque sus datos ya asumen una sesión que se
 * acaba de borrar. Un POST normal a este endpoint no pasa por esa
 * maquinaria: el navegador solo sigue el redirect, sin que React intente
 * reconciliar la pantalla vieja con la cuenta ya cerrada.
 */
export async function POST(request: Request) {
  await destroySessionCookie();
  redirect(new URL("/login", request.url).toString());
}

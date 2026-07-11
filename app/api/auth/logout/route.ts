import { redirect } from "next/navigation";
import { destroySessionCookie } from "@/lib/auth/session";

/**
 * Route Handler instead of Server Action: logging out from an
 * authenticated screen (Settings) and then asking that same screen to
 * re-render — the automatic refresh Next does after every Server Action —
 * breaks, because its data already assumes a session that was just
 * deleted. A plain POST to this endpoint skips that machinery: the
 * browser just follows the redirect, without React trying to reconcile
 * the old screen against the now-closed account.
 */
export async function POST(request: Request) {
  await destroySessionCookie();
  redirect(new URL("/login", request.url).toString());
}

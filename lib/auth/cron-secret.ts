import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Checks the shared-secret `Authorization: Bearer <CRON_SECRET>` header used
 * by the external cron triggers (see app/api/cron/*). Compares fixed-length
 * SHA-256 digests instead of the raw strings so the comparison itself can't
 * leak how many leading characters matched via response timing — same
 * reasoning as verifyPassword in lib/auth/password.ts. Hashing first also
 * sidesteps timingSafeEqual's own requirement that both buffers be the same
 * length, which a raw header of attacker-chosen length wouldn't satisfy.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const authHeader = request.headers.get("authorization") ?? "";
  const expectedHeader = `Bearer ${expected}`;
  const provided = createHash("sha256").update(authHeader).digest();
  const wanted = createHash("sha256").update(expectedHeader).digest();
  return timingSafeEqual(provided, wanted);
}

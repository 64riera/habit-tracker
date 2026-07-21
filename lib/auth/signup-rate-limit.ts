import "server-only";
import { createRateLimiter } from "./rate-limit";

/** Best-effort abuse mitigation for account creation (only reachable when
 * Google OAuth isn't configured — see isGoogleAuthEnabled). Keyed by IP
 * rather than username like login-rate-limit.ts: an attacker scripting
 * signups picks a fresh username every time, so username isn't a resource
 * worth protecting here — the account-creation endpoint itself is. Same
 * threshold/window as login (reuses its "tooManyAttempts" copy, so the two
 * stay in sync) — 5 in 15 minutes per IP is already generous enough for a
 * household/office sharing one address to sign up a few real accounts. See
 * rate-limit.ts for the in-memory/per-instance tradeoff. */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const limiter = createRateLimiter(MAX_ATTEMPTS, WINDOW_MS);

export function isSignupRateLimited(ip: string): boolean {
  return limiter.isLimited(ip);
}

export function recordSignupAttempt(ip: string): void {
  limiter.recordAttempt(ip);
}

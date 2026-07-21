import "server-only";
import { createRateLimiter } from "./rate-limit";

/** Best-effort brute-force mitigation for the manual username/password login
 * path (only reachable when Google OAuth isn't configured — see
 * isGoogleAuthEnabled). Keyed by username: it's the resource actually being
 * protected against brute force. See rate-limit.ts for the in-memory/
 * per-instance tradeoff. */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const limiter = createRateLimiter(MAX_ATTEMPTS, WINDOW_MS);

export function isLoginRateLimited(username: string): boolean {
  return limiter.isLimited(username);
}

export function recordFailedLoginAttempt(username: string): void {
  limiter.recordAttempt(username);
}

export function clearLoginAttempts(username: string): void {
  limiter.clear(username);
}

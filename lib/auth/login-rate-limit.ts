import "server-only";

/**
 * Best-effort brute-force mitigation for the manual username/password login
 * path (only reachable when Google OAuth isn't configured — see
 * isGoogleAuthEnabled). In-memory, so it's scoped to a single server
 * process: on a serverless host that's one warm Function instance, not the
 * whole deployment, so an attack spread across cold starts or concurrent
 * instances isn't fully covered. Still raises the bar for the common case
 * (a script hammering one instance) without pulling in an external store
 * this app doesn't otherwise need.
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const attemptsByUsername = new Map<string, { count: number; windowStart: number }>();

function isExpired(entry: { windowStart: number }): boolean {
  return Date.now() - entry.windowStart > WINDOW_MS;
}

export function isLoginRateLimited(username: string): boolean {
  const entry = attemptsByUsername.get(username);
  if (!entry) return false;
  if (isExpired(entry)) {
    attemptsByUsername.delete(username);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedLoginAttempt(username: string): void {
  const entry = attemptsByUsername.get(username);
  if (!entry || isExpired(entry)) {
    attemptsByUsername.set(username, { count: 1, windowStart: Date.now() });
    return;
  }
  entry.count += 1;
}

export function clearLoginAttempts(username: string): void {
  attemptsByUsername.delete(username);
}

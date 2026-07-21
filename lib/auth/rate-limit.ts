import "server-only";

/**
 * In-memory sliding-window attempt limiter, generic over whatever key the
 * caller wants to throttle (username for login, IP for signup — see
 * login-rate-limit.ts / signup-rate-limit.ts). Scoped to a single server
 * process: on a serverless host that's one warm Function instance, not the
 * whole deployment, so an attack spread across cold starts or concurrent
 * instances isn't fully covered. Still raises the bar for the common case
 * (a script hammering one instance) without pulling in an external store
 * this app doesn't otherwise need.
 */
export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attemptsByKey = new Map<string, { count: number; windowStart: number }>();

  function isExpired(entry: { windowStart: number }): boolean {
    return Date.now() - entry.windowStart > windowMs;
  }

  return {
    isLimited(key: string): boolean {
      const entry = attemptsByKey.get(key);
      if (!entry) return false;
      if (isExpired(entry)) {
        attemptsByKey.delete(key);
        return false;
      }
      return entry.count >= maxAttempts;
    },
    recordAttempt(key: string): void {
      const entry = attemptsByKey.get(key);
      if (!entry || isExpired(entry)) {
        attemptsByKey.set(key, { count: 1, windowStart: Date.now() });
        return;
      }
      entry.count += 1;
    },
    clear(key: string): void {
      attemptsByKey.delete(key);
    },
  };
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearLoginAttempts, isLoginRateLimited, recordFailedLoginAttempt } from "./login-rate-limit";

describe("login rate limiting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"));
  });

  afterEach(() => {
    clearLoginAttempts("alice");
    vi.useRealTimers();
  });

  it("isn't limited before any failed attempt", () => {
    expect(isLoginRateLimited("alice")).toBe(false);
  });

  it("stays unlimited under the threshold", () => {
    for (let i = 0; i < 4; i++) recordFailedLoginAttempt("alice");
    expect(isLoginRateLimited("alice")).toBe(false);
  });

  it("locks out once the threshold is reached", () => {
    for (let i = 0; i < 5; i++) recordFailedLoginAttempt("alice");
    expect(isLoginRateLimited("alice")).toBe(true);
  });

  it("doesn't affect a different username", () => {
    for (let i = 0; i < 5; i++) recordFailedLoginAttempt("alice");
    expect(isLoginRateLimited("bob")).toBe(false);
  });

  it("clears on a successful login", () => {
    for (let i = 0; i < 5; i++) recordFailedLoginAttempt("alice");
    clearLoginAttempts("alice");
    expect(isLoginRateLimited("alice")).toBe(false);
  });

  it("resets once the window expires", () => {
    for (let i = 0; i < 5; i++) recordFailedLoginAttempt("alice");
    expect(isLoginRateLimited("alice")).toBe(true);
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(isLoginRateLimited("alice")).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./cron-secret";

function requestWithAuth(header: string | null): Request {
  const headers = new Headers();
  if (header !== null) headers.set("authorization", header);
  return new Request("https://example.com/api/cron/reminders", { method: "POST", headers });
}

describe("isAuthorizedCronRequest", () => {
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret-123";
  });

  afterEach(() => {
    process.env.CRON_SECRET = original;
  });

  it("accepts the correct bearer token", () => {
    expect(isAuthorizedCronRequest(requestWithAuth("Bearer test-secret-123"))).toBe(true);
  });

  it("rejects a wrong token", () => {
    expect(isAuthorizedCronRequest(requestWithAuth("Bearer wrong"))).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isAuthorizedCronRequest(requestWithAuth(null))).toBe(false);
  });

  it("rejects a token of a completely different length without throwing", () => {
    expect(isAuthorizedCronRequest(requestWithAuth("Bearer x"))).toBe(false);
    expect(isAuthorizedCronRequest(requestWithAuth("Bearer " + "x".repeat(500)))).toBe(false);
  });

  it("fails closed when CRON_SECRET isn't configured", () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCronRequest(requestWithAuth("Bearer test-secret-123"))).toBe(false);
  });
});

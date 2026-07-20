import { describe, expect, it } from "vitest";
import { getGoogleProfile, resizeGoogleAvatarUrl } from "./google";

/** decodeIdToken (arctic) just base64url-decodes the JWT payload without
 * verifying the signature — a fake header/signature is fine for this. */
function fakeIdToken(claims: Record<string, unknown>): string {
  const base64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${base64url({ alg: "none" })}.${base64url(claims)}.signature`;
}

describe("resizeGoogleAvatarUrl", () => {
  it("replaces an existing size suffix with the requested one", () => {
    expect(resizeGoogleAvatarUrl("https://lh3.googleusercontent.com/a/ACg8oc123=s96-c", 112)).toBe(
      "https://lh3.googleusercontent.com/a/ACg8oc123=s112-c"
    );
  });

  it("appends a size suffix when the URL has none", () => {
    expect(resizeGoogleAvatarUrl("https://lh3.googleusercontent.com/a/ACg8oc123", 112)).toBe(
      "https://lh3.googleusercontent.com/a/ACg8oc123=s112-c"
    );
  });

  it("leaves non-Google-CDN URLs untouched", () => {
    const url = "https://example.com/avatar.png";
    expect(resizeGoogleAvatarUrl(url, 112)).toBe(url);
  });

  it("defaults to the app's display size when none is passed", () => {
    expect(resizeGoogleAvatarUrl("https://lh3.googleusercontent.com/a/ACg8oc123=s96-c")).toBe(
      "https://lh3.googleusercontent.com/a/ACg8oc123=s112-c"
    );
  });
});

describe("getGoogleProfile", () => {
  const baseClaims = { sub: "google-user-1", email: "person@example.com" };

  it("reads emailVerified true when Google asserts the email is verified", () => {
    const token = fakeIdToken({ ...baseClaims, email_verified: true });
    expect(getGoogleProfile(token).emailVerified).toBe(true);
  });

  it("reads emailVerified false when Google explicitly says it's unverified", () => {
    const token = fakeIdToken({ ...baseClaims, email_verified: false });
    expect(getGoogleProfile(token).emailVerified).toBe(false);
  });

  it("defaults emailVerified to false when the claim is missing entirely", () => {
    const token = fakeIdToken(baseClaims);
    expect(getGoogleProfile(token).emailVerified).toBe(false);
  });

  it("throws when the token has no email claim at all", () => {
    const token = fakeIdToken({ sub: "google-user-1" });
    expect(() => getGoogleProfile(token)).toThrow();
  });
});

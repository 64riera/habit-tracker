import { describe, expect, it } from "vitest";
import { resizeGoogleAvatarUrl } from "./google";

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

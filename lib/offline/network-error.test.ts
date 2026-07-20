import { describe, expect, it } from "vitest";
import { isLikelyNetworkError } from "./network-error";

describe("isLikelyNetworkError", () => {
  it("treats any error as a network error while offline", () => {
    expect(isLikelyNetworkError(new Error("whatever"), false)).toBe(true);
    expect(isLikelyNetworkError("not even an Error", false)).toBe(true);
  });

  it("recognizes the fetch-failure messages browsers actually throw", () => {
    expect(isLikelyNetworkError(new TypeError("Failed to fetch"), true)).toBe(true);
    expect(isLikelyNetworkError(new TypeError("NetworkError when attempting to fetch resource."), true)).toBe(true);
    expect(isLikelyNetworkError(new TypeError("Load failed"), true)).toBe(true);
  });

  it("treats a server-rejected mutation as not a network error", () => {
    expect(isLikelyNetworkError(new Error("Habit not found"), true)).toBe(false);
    expect(isLikelyNetworkError(new TypeError("Cannot read properties of undefined"), true)).toBe(false);
  });
});

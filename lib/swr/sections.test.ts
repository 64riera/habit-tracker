import { describe, expect, it } from "vitest";
import { unstable_serialize } from "swr";
import { sectionRegistry } from "./sections";

describe("sectionRegistry", () => {
  it("gives every entry a key and a fetcher", () => {
    for (const entry of sectionRegistry) {
      expect(typeof entry.key).toBe("function");
      expect(typeof entry.fetcher).toBe("function");
    }
  });

  it("has no duplicate keys for a given day", () => {
    const serialized = sectionRegistry.map((entry) => unstable_serialize(entry.key("2026-07-13")));
    expect(new Set(serialized).size).toBe(serialized.length);
  });
});

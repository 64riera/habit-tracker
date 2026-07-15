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

  it("tags only the sections realtime is actually scoped to (habits, finance)", () => {
    // Regression guard: a push for one of these domains (see
    // lib/realtime/domain.ts) refreshes exactly the tagged sections —
    // untagging one silently stops it from updating in realtime, and
    // over-tagging one fetches data a push never actually changed.
    const tagged = sectionRegistry
      .filter((entry) => entry.realtimeDomain != null)
      .map((entry) => ({ key: unstable_serialize(entry.key("2026-07-13")), domain: entry.realtimeDomain }));
    expect(tagged).toEqual([
      { key: unstable_serialize(["today:habits", "2026-07-13"]), domain: "habits" },
      { key: unstable_serialize(["habits:list", "2026-07-13"]), domain: "habits" },
      { key: unstable_serialize(["finance:transactions"]), domain: "finance" },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import type { State } from "swr";
import { serializeCache, hydrateCache } from "./idb-cache-provider";

describe("serializeCache / hydrateCache", () => {
  it("round-trips an empty cache", () => {
    const map = new Map<string, State>();
    expect(hydrateCache(serializeCache(map))).toEqual(new Map());
  });

  it("round-trips entries, preserving keys and values", () => {
    const map = new Map<string, State>([
      ["habits:list,2026-07-13", { data: [{ id: "a" }], isLoading: false } as State],
      ["finance:transactions", { data: [], isLoading: true } as State],
    ]);
    const roundTripped = hydrateCache(serializeCache(map));
    expect(roundTripped).toEqual(map);
  });

  it("serialize produces a plain array (structured-clone-safe, not a Map)", () => {
    const map = new Map<string, State>([["a", { data: 1 } as State]]);
    const entries = serializeCache(map);
    expect(Array.isArray(entries)).toBe(true);
    expect(entries).toEqual([["a", { data: 1 }]]);
  });
});

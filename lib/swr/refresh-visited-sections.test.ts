import { describe, expect, it, vi } from "vitest";
import { unstable_serialize } from "swr";
import type { Cache, State } from "swr";
import { refreshVisitedSections } from "./refresh-visited-sections";
import type { SectionEntry } from "./sections";

function fakeCache(visitedKeys: string[]): Cache {
  const store = new Map<string, State>(visitedKeys.map((key) => [key, { data: "cached" } as State]));
  return {
    keys: () => store.keys(),
    get: (key) => store.get(key),
    set: (key, value) => void store.set(key, value),
    delete: (key) => void store.delete(key),
  };
}

describe("refreshVisitedSections", () => {
  it("refetches and mutates a section already present in the cache", async () => {
    const cache = fakeCache([unstable_serialize(["visited"])]);
    const mutate = vi.fn().mockResolvedValue(undefined);
    const fetcher = vi.fn().mockResolvedValue("fresh-data");
    const registry: SectionEntry[] = [{ key: () => ["visited"], fetcher }];

    await refreshVisitedSections(cache, mutate, "2026-07-13", registry);

    expect(fetcher).toHaveBeenCalledWith("2026-07-13");
    expect(mutate).toHaveBeenCalledWith(["visited"], "fresh-data", { revalidate: false });
  });

  it("skips a section that was never visited", async () => {
    const cache = fakeCache([]);
    const mutate = vi.fn().mockResolvedValue(undefined);
    const fetcher = vi.fn().mockResolvedValue("fresh-data");
    const registry: SectionEntry[] = [{ key: () => ["never-visited"], fetcher }];

    await refreshVisitedSections(cache, mutate, "2026-07-13", registry);

    expect(fetcher).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("keeps refreshing other sections when one fetcher rejects", async () => {
    const cache = fakeCache([unstable_serialize(["broken"]), unstable_serialize(["healthy"])]);
    const mutate = vi.fn().mockResolvedValue(undefined);
    const brokenFetcher = vi.fn().mockRejectedValue(new Error("offline mid-fetch"));
    const healthyFetcher = vi.fn().mockResolvedValue("fresh-data");
    const registry: SectionEntry[] = [
      { key: () => ["broken"], fetcher: brokenFetcher },
      { key: () => ["healthy"], fetcher: healthyFetcher },
    ];

    await refreshVisitedSections(cache, mutate, "2026-07-13", registry);

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(["healthy"], "fresh-data", { revalidate: false });
  });
});

import { unstable_serialize } from "swr";
import type { Cache, ScopedMutator } from "swr";
import { sectionRegistry, type SectionEntry } from "@/lib/swr/sections";

/**
 * Refreshes every section whose canonical key is already present in `cache`
 * (i.e. was visited at least once, this session or a prior one) so stale
 * background data gets updated on reconnect even if that section isn't
 * currently mounted. Sections never visited are intentionally left alone —
 * no proactive prefetching of unvisited sections.
 *
 * `registry` defaults to the real section list; tests inject a fake one
 * instead of mocking the module graph of live server actions.
 */
export async function refreshVisitedSections(
  cache: Cache,
  mutate: ScopedMutator,
  today: string,
  registry: SectionEntry[] = sectionRegistry
): Promise<void> {
  await Promise.allSettled(
    registry.map(async (section) => {
      const key = section.key(today);
      if (cache.get(unstable_serialize(key)) === undefined) return;
      const data = await section.fetcher(today);
      await mutate(key, data, { revalidate: false });
    })
  );
}

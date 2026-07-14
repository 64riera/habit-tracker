"use client";

import type { useRouter } from "next/navigation";
import type { Cache, ScopedMutator } from "swr";
import { refreshVisitedSections } from "@/lib/swr/refresh-visited-sections";
import { getClientToday } from "@/lib/date-client";

/** Routes with an action that doesn't depend on any previously-loaded data
 * (starting a focus session, logging a transaction, adding/checking a
 * task, logging a gym session) — kept warm in the background whenever
 * online so they're usable offline even the very first time they're
 * opened, not just after a first visit. Deliberately NOT every route:
 * sections whose whole value is showing past data (History, Stats, ...)
 * have nothing useful to offer without it, so they keep the normal "must
 * visit once" rule. Don't add a route here without that same justification.
 * /more is included for a different reason: it has no data of its own, but
 * since Tasks and Gym are only reachable through it (see
 * components/nav/nav-items.ts), it has to work offline unvisited too, or
 * their own guarantee above would be unreachable in practice. */
const ALWAYS_WARM_ROUTES = ["/focus", "/finance", "/tasks", "/gym", "/more"];

function warmAlwaysAvailableRoutes(router: ReturnType<typeof useRouter>) {
  for (const route of ALWAYS_WARM_ROUTES) router.prefetch(route);
}

type ResyncDeps = {
  cache: Cache;
  mutate: ScopedMutator;
  router: ReturnType<typeof useRouter>;
};

/**
 * "Bring this device's view up to date with whatever changed — here or
 * anywhere else." Shared by two independent triggers that both ultimately
 * mean the same thing:
 *  - `OfflineProvider`'s `drainQueue`, after replaying this device's own
 *    queued mutations (or simply regaining connectivity with nothing
 *    queued — another device may have written meanwhile).
 *  - `RealtimeProvider`, on an incoming push notifying that some other
 *    device just changed something.
 *
 * Always runs all four steps unconditionally (no longer gated on "was
 * anything queued locally", unlike the code this was extracted from) —
 * revalidating the whole SWR cache and refreshing the Server Component
 * tree are what actually pick up a *remote* change for content that isn't
 * one of the explicitly visited `sectionRegistry` entries, which matters
 * now that this also runs in response to another device's write.
 */
export async function resyncEverything({ cache, mutate, router }: ResyncDeps): Promise<void> {
  mutate(() => true);
  router.refresh();
  await refreshVisitedSections(cache, mutate, getClientToday());
  warmAlwaysAvailableRoutes(router);
}

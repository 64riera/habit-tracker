"use client";

import { useEffect } from "react";
import useSWR, { type Key } from "swr";

/**
 * useSWR wired for this app's "Server Component still does the first fetch"
 * pattern: `initialData` is only consulted by SWR on the very first mount
 * (as `fallbackData`). If the Server Component later re-runs with fresher
 * data — e.g. a create/edit form's server action redirects back to this
 * same route — that arrives here as a new `initialData` value, which SWR
 * would otherwise silently ignore since its cache is already populated.
 * This effect detects that prop change (by reference) and pushes it into
 * the cache without triggering a redundant network refetch.
 *
 * Deliberately an effect, not a synchronous push during render: an earlier
 * version mutated the cache directly in the render body (to avoid an extra
 * paint), but that silently failed to ever clear the cached value once it
 * legitimately transitioned to `undefined` — the mutate's own cache update
 * wasn't visible to *that same render's* already-computed `swr.data`, and
 * nothing forced a further re-render to pick it up, so the stale value
 * stuck around until an unrelated re-render or a hard reload (found via the
 * gym "session in progress" card, the first caller whose data can
 * genuinely be `undefined` and not just an empty array/falsy default).
 * Syncing external state from an effect is the well-supported pattern for
 * exactly this; any resulting extra paint is unnoticeable next to the
 * network round-trip that produced the new `initialData` in the first
 * place.
 */
export function usePageData<T>(key: Key, fetcher: () => Promise<T>, initialData: T) {
  const swr = useSWR<T>(key, fetcher, { fallbackData: initialData });
  const { mutate } = swr;
  useEffect(() => {
    mutate(initialData, { revalidate: false });
  }, [initialData, mutate]);
  // `data` is only actually `undefined` before the very first render commits
  // fallbackData into SWR's cache — this makes that guarantee visible to
  // TypeScript too, so every call site gets non-optional data.
  return { ...swr, data: swr.data ?? initialData };
}

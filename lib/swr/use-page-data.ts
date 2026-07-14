"use client";

import { useState } from "react";
import useSWR, { type Key } from "swr";

/**
 * useSWR wired for this app's "Server Component still does the first fetch"
 * pattern: `initialData` is only consulted by SWR on the very first mount
 * (as `fallbackData`). If the Server Component later re-runs with fresher
 * data — e.g. a create/edit form's server action redirects back to this
 * same route — that arrives here as a new `initialData` value, which SWR
 * would otherwise silently ignore since its cache is already populated.
 * This hook detects that prop change (by reference, during render — not an
 * effect, so it costs no extra paint) and pushes it into the cache without
 * triggering a redundant network refetch.
 */
export function usePageData<T>(key: Key, fetcher: () => Promise<T>, initialData: T) {
  const swr = useSWR<T>(key, fetcher, { fallbackData: initialData });
  const [prevInitial, setPrevInitial] = useState(initialData);
  if (initialData !== prevInitial) {
    setPrevInitial(initialData);
    swr.mutate(initialData, { revalidate: false });
  }
  // `data` is only actually `undefined` before the very first render commits
  // fallbackData into SWR's cache — this makes that guarantee visible to
  // TypeScript too, so every call site gets non-optional data.
  return { ...swr, data: swr.data ?? initialData };
}

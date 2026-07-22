"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { useOffline } from "@/lib/offline/client";
import type { QueuedMutation } from "@/lib/offline/db";
import type { GymSessionDraftValues } from "@/lib/validation/gym";

export type OfflineFormState = { error?: string; queued?: boolean };

type SafeParseable<TValues> = {
  safeParse: (data: unknown) => { success: boolean; data?: TValues };
};

type OfflineFormActionConfig<TValues> = {
  schema: SafeParseable<TValues>;
  extractFields: (formData: FormData) => unknown;
  buildMutation: (id: string, values: TValues) => QueuedMutation;
  onlineAction: (prevState: OfflineFormState, formData: FormData) => Promise<OfflineFormState>;
};

/**
 * Wraps a form server action (create/edit) so that, when offline, it
 * validates with the same schema on the client and queues the mutation
 * instead of failing.
 *
 * The online path still redirects from the server action itself (a real
 * navigation, the same one the Service Worker already caches) —
 * `unstable_rethrow` lets that `NEXT_REDIRECT` pass through without our
 * try/catch confusing it with a transport failure, which is the only case
 * that should fall to the offline branch. When offline we do NOT navigate:
 * a `router.push` to a route the browser hasn't cached can fail ugly (the
 * browser's own error screen); the global sync indicator already signals
 * that it was queued.
 */
export function useOfflineFormAction<TValues>(config: OfflineFormActionConfig<TValues>) {
  const { isOnline, runOrQueue } = useOffline();

  return useCallback(
    async (prevState: OfflineFormState, formData: FormData): Promise<OfflineFormState> => {
      if (isOnline) {
        try {
          return await config.onlineAction(prevState, formData);
        } catch (err) {
          unstable_rethrow(err);
          // Only a real transport/connection failure reaches here: validation
          // never throws (it uses safeParse) and a success already redirected above.
        }
      }
      const parsed = config.schema.safeParse(config.extractFields(formData));
      if (!parsed.success || !parsed.data) return { error: "invalid" };
      const id = String(formData.get("id") ?? "");
      await runOrQueue(config.buildMutation(id, parsed.data));
      return { queued: true };
    },
    [isOnline, runOrQueue, config]
  );
}

type OfflineIdActionConfig = {
  onlineAction: () => Promise<void>;
  buildMutation: () => QueuedMutation;
};

export type DraftAutosaveStatus = "idle" | "saving" | "saved";

const DRAFT_AUTOSAVE_DEBOUNCE_MS = 1200;

/**
 * Debounced autosave for an in-progress gym session (see
 * saveGymSessionDraftCore) — reuses the exact same online-or-queue
 * transport as every other write in the app (`useOffline().runOrQueue`),
 * so an autosaved draft survives going offline (or the app closing
 * outright) the same way any other queued mutation already does; no
 * separate local-storage layer.
 *
 * `dirty` gates both the very first tick (an untouched, freshly opened
 * form shouldn't autosave anything) and the tail end after a real "Guardar"
 * submit already queued offline (the caller should flip it false once
 * `state.queued` is true, so this doesn't keep re-saving as a draft
 * something that was just confirmed for real).
 *
 * `serializedValues` is a cheap string identity for "did the draft change
 * since last render" — it drives the debounce effect instead of `values`
 * itself (a fresh object every render, which would restart the timer on
 * every keystroke's re-render even without a real change). `values` is
 * still read fresh from a ref when the timer fires, so a save always
 * reflects the latest state even though the timer was scheduled earlier.
 */
export function useGymSessionDraftAutosave({
  id,
  dirty,
  values,
  serializedValues,
}: {
  id: string;
  dirty: boolean;
  values: GymSessionDraftValues;
  serializedValues: string;
}): DraftAutosaveStatus {
  const { runOrQueue } = useOffline();
  const [status, setStatus] = useState<DraftAutosaveStatus>("idle");
  const valuesRef = useRef(values);
  const runOrQueueRef = useRef(runOrQueue);
  // Keeps both refs pointing at the latest render's values without reading
  // or writing `.current` during render itself (only allowed in effects/
  // event handlers) — this effect has no dependency array so it re-runs
  // after every render, right after commit.
  useEffect(() => {
    valuesRef.current = values;
    runOrQueueRef.current = runOrQueue;
  });

  const flush = useCallback(() => {
    setStatus("saving");
    void runOrQueueRef.current({ type: "saveGymSessionDraft", id, values: valuesRef.current }).then(() =>
      setStatus("saved")
    );
  }, [id]);

  useEffect(() => {
    // serializedValues (not `values`, a fresh object every render) is the real change signal.
    if (!dirty) return;
    const timer = setTimeout(flush, DRAFT_AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [dirty, serializedValues, flush]);

  // Catches the "app closes before the debounce fires" case this feature
  // exists for: `visibilitychange`(hidden) covers a backgrounded/killed PWA,
  // `pagehide` covers a closed tab/navigation away.
  useEffect(() => {
    if (!dirty) return;
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
    };
  }, [dirty, flush]);

  return status;
}

/** Same as `useOfflineFormAction` but for actions without fields (archive, delete). */
export function useOfflineIdAction(config: OfflineIdActionConfig) {
  const { isOnline, runOrQueue } = useOffline();

  return useCallback(async () => {
    if (isOnline) {
      try {
        await config.onlineAction();
        return;
      } catch (err) {
        unstable_rethrow(err);
        // Real transport/connection failure: falls to the offline branch.
      }
    }
    await runOrQueue(config.buildMutation());
  }, [isOnline, runOrQueue, config]);
}

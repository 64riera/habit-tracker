"use client";

import { useCallback } from "react";
import { unstable_rethrow } from "next/navigation";
import { useOffline } from "@/lib/offline/client";
import type { QueuedMutation } from "@/lib/offline/db";

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

import "server-only";
import { cache } from "react";
import { after } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { publishChange } from "@/lib/realtime/pusher-server";
import type { RealtimeDomain } from "@/lib/realtime/domain";

/**
 * Called from inside a domain's `revalidateXPaths()` helper (see
 * lib/actions/{logs,habits,focus,transactions}.ts — the only four wired
 * to realtime, see lib/realtime/domain.ts) — one shared call site instead
 * of one per mutation, so adding realtime sync to a new domain later is a
 * one-line addition to its own revalidate helper, not a new call
 * scattered through every action.
 *
 * `cache()`-memoized per (request, domain): a single Server Action can
 * call its revalidate helper more than once for the same domain (or two
 * helpers for two domains, e.g. a focus session auto-completing its
 * linked habit touches both "focus" and "habits") — `cache()` collapses
 * repeat calls with the same domain into the one that actually runs, so
 * one user action costs at most one Pusher message per affected domain,
 * never one per revalidate call. Scheduling the publish via `after()`
 * happens inside here (not at each call site) precisely so this
 * memoization can cover it too.
 */
export const notifyDeviceSync = cache((domain: RealtimeDomain): void => {
  after(() => {
    getCurrentUserId()
      .then((userId) => publishChange(userId, domain))
      .catch((err) => {
        console.error("notifyDeviceSync failed:", err);
      });
  });
});

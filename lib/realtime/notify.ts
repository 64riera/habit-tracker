import "server-only";
import { getCurrentUserId } from "@/lib/auth/session";
import { publishChange } from "@/lib/realtime/pusher-server";

/**
 * Called from inside every domain's `revalidateXPaths()` helper (see
 * lib/actions/*.ts) — one shared call site instead of one per mutation, so
 * adding realtime sync to a new domain later is a one-line addition to its
 * own revalidate helper, not a new call scattered through every action.
 *
 * Deliberately synchronous-looking (returns `void`, not awaited by
 * callers): resolving the user and publishing happen in the background via
 * `after()` at the call site, and neither step is allowed to affect the
 * mutation that triggered it — `getCurrentUserId()` failing (no session,
 * expired token) is caught here exactly like a Pusher failure would be.
 */
export function notifyDeviceSync(): void {
  getCurrentUserId()
    .then((userId) => publishChange(userId))
    .catch((err) => {
      console.error("notifyDeviceSync failed:", err);
    });
}

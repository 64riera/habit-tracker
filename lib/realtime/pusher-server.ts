import "server-only";
import Pusher from "pusher";
import { privateUserChannel } from "@/lib/realtime/channel";

/**
 * Lazily constructed, memoized once. `null` whenever any of the 4 required
 * env vars is missing — every caller in this module treats that as "not
 * configured" and no-ops, never as an error. This is the one deliberate
 * spot the whole realtime feature is optional from: nothing upstream of
 * this file needs to know or care whether Pusher is actually set up.
 */
let cached: Pusher | null | undefined;

function getPusherServer(): Pusher | null {
  if (cached !== undefined) return cached;

  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    cached = null;
    return cached;
  }

  cached = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  });
  return cached;
}

/**
 * Fire-and-forget by design: a realtime push is a nice-to-have on top of
 * the app's existing reconnect-triggered resync (see
 * lib/swr/resync-everything.ts), never a requirement for a mutation to
 * "succeed" — so this never throws. Not configured, or Pusher's API
 * unreachable/erroring, both just mean the other device(s) fall back to
 * their existing resync-on-reconnect/focus behavior instead of an instant
 * push, which is the documented degradation guarantee for this feature.
 */
export async function publishChange(userId: string): Promise<void> {
  const client = getPusherServer();
  if (!client) return;
  try {
    await client.trigger(privateUserChannel(userId), "changed", {});
  } catch (err) {
    console.error("Pusher publish failed:", err);
  }
}

export { getPusherServer };

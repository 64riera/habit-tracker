"use server";

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";

type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Saves (or updates, if the endpoint already existed) the current
 * browser's push subscription. `endpoint` is unique per browser/device — the
 * same user can have several rows (phone + laptop). */
export async function subscribeToPush(subscription: PushSubscriptionInput) {
  const userId = await getCurrentUserId();
  await db
    .insert(pushSubscriptions)
    .values({
      id: nanoid(),
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    });
}

export async function unsubscribeFromPush(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

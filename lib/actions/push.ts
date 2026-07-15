"use server";

import { and, eq } from "drizzle-orm";
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
 * same user can have several rows (phone + laptop). The conflict branch
 * also reassigns `userId`: on a shared/family device, browser push
 * subscriptions persist across logout, so if a different account
 * re-subscribes from the same browser, this endpoint must now point at
 * *that* account — otherwise the reminders cron (app/api/cron/reminders)
 * would keep delivering the previous account's habit reminders to it. */
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
      set: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    });
}

/** Scoped by `userId` as well as `endpoint`: without it, anyone who learns
 * another account's push endpoint (not a secret value — it's a public
 * push-service URL sent to the client) could delete that account's
 * subscription and silently kill their reminders. */
export async function unsubscribeFromPush(endpoint: string) {
  const userId = await getCurrentUserId();
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)));
}

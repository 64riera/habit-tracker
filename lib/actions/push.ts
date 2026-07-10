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

/** Guarda (o actualiza, si el endpoint ya existía) la suscripción push del
 * navegador actual. `endpoint` es único por navegador/dispositivo — un mismo
 * usuario puede tener varias filas (celular + laptop). */
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

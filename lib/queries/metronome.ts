import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { metronomeTimers } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import type { TimerRow } from "@/lib/metronome/timer-compute";

/** `null` when there's no timer running/paused for this account — a fresh
 * "set a duration and start" screen, not an error state. */
export async function getActiveTimer(): Promise<TimerRow | null> {
  const userId = await getCurrentUserId();
  const [row] = await db.select().from(metronomeTimers).where(eq(metronomeTimers.userId, userId)).limit(1);
  return row ?? null;
}

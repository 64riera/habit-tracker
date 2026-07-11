import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { focusSessions } from "@/lib/db/schema";
import { LIVE_STATUSES } from "@/lib/focus/compute";
import { reconcileAndPersist } from "@/lib/queries/focus";

/**
 * Force-finishes focus sessions that ran past their cap (2h stopwatch, 4h
 * countdown — see STOPWATCH_CAP_MINUTES/COUNTDOWN_MAX_MINUTES in
 * lib/focus/compute.ts) while nobody had the app open to catch it via the
 * normal read-time reconciliation (getActiveFocusSession, called whenever
 * a client fetches the active session). Without this, a session stays
 * "running" in the database forever if the user never reopens the app —
 * no completion, no streak/reward unlock, stats never see it.
 *
 * Triggered by the same external cron as reminders (no user session here,
 * see .github/workflows/push-reminders.yml), authenticated with the same
 * shared CRON_SECRET. reconcileAndPersist is a no-op (no write) for any
 * session that isn't actually over its cap yet, so scanning every live
 * session on each tick is cheap.
 */
export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await db.select().from(focusSessions).where(inArray(focusSessions.status, LIVE_STATUSES));
  const now = new Date();

  // Every row here started out live (see the LIVE_STATUSES filter above), so
  // coming back "completed" can only mean this call is the one that just
  // pushed it over its cap — no separate "changed" flag needed.
  let finalized = 0;
  for (const row of rows) {
    const { session } = await reconcileAndPersist(row, now);
    if (session.status === "completed") finalized++;
  }

  return Response.json({ checked: rows.length, finalized });
}

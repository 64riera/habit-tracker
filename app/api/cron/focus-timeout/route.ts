import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { focusSessions } from "@/lib/db/schema";
import { LIVE_STATUSES } from "@/lib/focus/compute";
import { reconcileAndPersist } from "@/lib/queries/focus";
import { isAuthorizedCronRequest } from "@/lib/auth/cron-secret";

/**
 * Force-finishes focus sessions that ran past their cap (2h stopwatch, 4h
 * countdown — see STOPWATCH_CAP_MINUTES/COUNTDOWN_MAX_MINUTES in
 * lib/focus/compute.ts) while nobody had the app open to catch it via the
 * normal read-time reconciliation (getActiveFocusSession, called whenever
 * a client fetches the active session). Without this, a session stays
 * "running" in the database forever if the user never reopens the app —
 * no completion, no streak/reward unlock, stats never see it.
 *
 * reconcileAndPersist also carries a second, independent check on every
 * call: if the session is linked to a habit and enough active time has
 * gone in, it marks that habit "done" for the day (see
 * autoCompleteLinkedHabitIfDue in lib/queries/focus.ts) — this is what
 * catches that case too when nobody has the app open, since a habit's
 * threshold is usually well under the session's own cap.
 *
 * Triggered by the same external cron as reminders (no user session here,
 * see .github/workflows/push-reminders.yml), authenticated with the same
 * shared CRON_SECRET. Scanning every live session on each tick is cheap:
 * reconcileAndPersist skips the session-status write entirely when there's
 * nothing to change, and the habit check is a couple of indexed reads that
 * short-circuit as soon as either the threshold isn't met or the habit is
 * already logged done.
 */
export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await db.select().from(focusSessions).where(inArray(focusSessions.status, LIVE_STATUSES));
  const now = new Date();

  // Every row here started out live (see the LIVE_STATUSES filter above), so
  // coming back "completed" can only mean this call is the one that just
  // pushed it over its cap — no separate "changed" flag needed.
  let finalized = 0;
  let errors = 0;
  for (const row of rows) {
    // Isolated per row: one session hitting a constraint (e.g. a race with
    // the user's own client reconciling the same session at read-time)
    // shouldn't stop every other overdue session in this batch from being
    // finalized too.
    try {
      const { session } = await reconcileAndPersist(row, now);
      if (session.status === "completed") finalized++;
    } catch {
      errors++;
    }
  }

  return Response.json({ checked: rows.length, finalized, errors });
}

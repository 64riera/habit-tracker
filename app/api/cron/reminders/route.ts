import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import webpush from "web-push";
import { db } from "@/lib/db/client";
import { habits, pushSubscriptions, reminderSends, users } from "@/lib/db/schema";
import { isReminderDue } from "@/lib/push/reminder-window";
import { isAuthorizedCronRequest } from "@/lib/auth/cron-secret";

// Matches the frequency of the external cron (.github/workflows/push-reminders.yml):
// each run should only catch reminders that became "due" since the previous run.
const WINDOW_MINUTES = 15;

const REMINDER_PREFIX: Record<"es" | "en", string> = {
  es: "Es hora de: ",
  en: "Time for: ",
};

function nowHHMMInTimezone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date());
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function todayInTimezone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/**
 * Triggered by a free external cron (GitHub Actions, not Vercel Cron — see
 * .github/workflows/push-reminders.yml), not by a browser: there's no user
 * session, so it iterates over all accounts instead of using
 * getCurrentUserId(). Protected with a shared secret instead of a cookie.
 *
 * Deliberate simplification (v1): it doesn't check whether the habit was
 * already marked done today — that would require each user's day cutoff,
 * which today only lives in a browser cookie, not on the account (the same
 * gap as the global day-cutoff one, out of scope here).
 */
export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return Response.json({ error: "vapid keys not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const rows = await db
    .select({
      habitId: habits.id,
      habitName: habits.name,
      reminders: habits.reminders,
      userId: users.id,
      timezone: users.timezone,
      locale: users.localePreference,
    })
    .from(habits)
    .innerJoin(users, eq(habits.userId, users.id))
    .where(and(eq(habits.status, "active"), isNotNull(habits.reminders), isNotNull(users.timezone)));

  const nowByTimezone = new Map<string, string>();
  const todayByTimezone = new Map<string, string>();
  const dueHabits: { habitId: string; habitName: string; userId: string; locale: "es" | "en" }[] = [];

  for (const row of rows) {
    const timezone = row.timezone!;
    let nowHHMM = nowByTimezone.get(timezone);
    if (!nowHHMM) {
      nowHHMM = nowHHMMInTimezone(timezone);
      nowByTimezone.set(timezone, nowHHMM);
    }
    let today = todayByTimezone.get(timezone);
    if (!today) {
      today = todayInTimezone(timezone);
      todayByTimezone.set(timezone, today);
    }
    const reminderTimes: string[] = JSON.parse(row.reminders!);
    const dueReminderTime = reminderTimes.find((reminderTime) => isReminderDue(reminderTime, nowHHMM, WINDOW_MINUTES));
    if (!dueReminderTime) continue;

    // Claims this exact (habit, day, reminder time) occurrence first: a
    // retry or an overlapping invocation of this same cron for the same
    // window finds the row already there, and onConflictDoNothing() makes
    // it a no-op instead of a second push notification.
    const claim = await db
      .insert(reminderSends)
      .values({ id: nanoid(), habitId: row.habitId, date: today, reminderTime: dueReminderTime })
      .onConflictDoNothing();
    if (claim.rowsAffected === 0) continue;

    dueHabits.push({ habitId: row.habitId, habitName: row.habitName, userId: row.userId, locale: row.locale });
  }

  if (dueHabits.length === 0) {
    return Response.json({ sent: 0, skipped: 0, errors: 0 });
  }

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, [...new Set(dueHabits.map((h) => h.userId))]));
  const subscriptionsByUser = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions) {
    subscriptionsByUser.set(sub.userId, [...(subscriptionsByUser.get(sub.userId) ?? []), sub]);
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const habit of dueHabits) {
    const userSubscriptions = subscriptionsByUser.get(habit.userId) ?? [];
    if (userSubscriptions.length === 0) {
      skipped++;
      continue;
    }
    const payload = JSON.stringify({
      title: habit.habitName,
      body: `${REMINDER_PREFIX[habit.locale]}${habit.habitName}`,
      url: `/habits/${habit.habitId}`,
    });
    for (const sub of userSubscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        }
        errors++;
      }
    }
  }

  return Response.json({ sent, skipped, errors });
}

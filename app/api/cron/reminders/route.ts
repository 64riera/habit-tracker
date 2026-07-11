import { and, eq, inArray, isNotNull } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/lib/db/client";
import { habits, pushSubscriptions, users } from "@/lib/db/schema";
import { isReminderDue } from "@/lib/push/reminder-window";

// Coincide con la frecuencia del cron externo (.github/workflows/push-reminders.yml):
// cada corrida solo debe atrapar los recordatorios "due" desde la corrida anterior.
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

/**
 * Disparado por un cron externo gratuito (GitHub Actions, no Vercel Cron —
 * ver .github/workflows/push-reminders.yml), no por un navegador: no hay
 * sesión de usuario, así que recorre todas las cuentas en vez de usar
 * getCurrentUserId(). Protegido con un secreto compartido en vez de cookie.
 *
 * Simplificación deliberada (v1): no revisa si el hábito ya se marcó como
 * hecho hoy — eso requeriría el corte de día de cada usuario, que hoy solo
 * vive en una cookie de navegador, no en la cuenta (mismo hueco que el del
 * corte de día global, fuera de alcance acá).
 */
export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
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
  const dueHabits: { habitId: string; habitName: string; userId: string; locale: "es" | "en" }[] = [];

  for (const row of rows) {
    const timezone = row.timezone!;
    let nowHHMM = nowByTimezone.get(timezone);
    if (!nowHHMM) {
      nowHHMM = nowHHMMInTimezone(timezone);
      nowByTimezone.set(timezone, nowHHMM);
    }
    const reminderTimes: string[] = JSON.parse(row.reminders!);
    const isDue = reminderTimes.some((reminderTime) => isReminderDue(reminderTime, nowHHMM, WINDOW_MINUTES));
    if (isDue) {
      dueHabits.push({ habitId: row.habitId, habitName: row.habitName, userId: row.userId, locale: row.locale });
    }
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

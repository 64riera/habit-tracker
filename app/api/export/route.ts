import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { habitLogs, habits } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";
  const habitId = url.searchParams.get("habit") ?? undefined;
  const categoryId = url.searchParams.get("category") ?? undefined;

  const userId = await getCurrentUserId();
  const conditions = [eq(habits.userId, userId)];
  if (habitId) conditions.push(eq(habitLogs.habitId, habitId));
  if (categoryId) conditions.push(eq(habits.categoryId, categoryId));

  const rows = await db
    .select({
      date: habitLogs.date,
      habitName: habits.name,
      status: habitLogs.status,
      value: habitLogs.value,
      note: habitLogs.note,
      mood: habitLogs.mood,
      loggedAt: habitLogs.loggedAt,
    })
    .from(habitLogs)
    .innerJoin(habits, eq(habits.id, habitLogs.habitId))
    .where(and(...conditions))
    .orderBy(habitLogs.date);

  if (format === "json") {
    return new Response(JSON.stringify(rows, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="just-go-historial.json"',
      },
    });
  }

  const header = "date,habit,status,value,note,mood,logged_at";
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = rows.map((r) =>
    [r.date, r.habitName, r.status, r.value, r.note, r.mood, r.loggedAt].map(escape).join(",")
  );
  const csv = [header, ...lines].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="just-go-historial.csv"',
    },
  });
}

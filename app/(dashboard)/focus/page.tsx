import { getActiveFocusSession, getFocusSettings, getTodayFocusProgress } from "@/lib/queries/focus";
import { getCategories, getHabitNames } from "@/lib/queries/habits";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { FocusClient } from "./focus-client";

export default async function EnfoquePage({
  searchParams,
}: {
  searchParams: Promise<{ habitId?: string }>;
}) {
  const { habitId } = await searchParams;
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);

  const session = await getActiveFocusSession();
  const [settings, habitOptions, categories, progress] = await Promise.all([
    getFocusSettings(),
    getHabitNames(),
    getCategories(),
    getTodayFocusProgress(today, session),
  ]);

  return (
    <FocusClient
      session={session}
      settings={settings}
      habitOptions={habitOptions}
      categories={categories}
      progress={progress}
      today={today}
      defaultHabitId={habitId}
    />
  );
}

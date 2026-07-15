import { getActiveFocusSession, getFocusSettings, getTodayFocusProgress } from "@/lib/queries/focus";
import { getCategories, getHabitNames } from "@/lib/queries/habits";
import { getServerToday } from "@/lib/settings/date-server";
import { FocusClient } from "./focus-client";

export default async function EnfoquePage({
  searchParams,
}: {
  searchParams: Promise<{ habitId?: string }>;
}) {
  const [{ habitId }, today, session, settings, habitOptions, categories] = await Promise.all([
    searchParams,
    getServerToday(),
    getActiveFocusSession(),
    getFocusSettings(),
    getHabitNames(),
    getCategories(),
  ]);
  // Depends on `session`, so it can't join the batch above — everything
  // else there is independent of it and no longer waits behind it.
  const progress = await getTodayFocusProgress(today, session);

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

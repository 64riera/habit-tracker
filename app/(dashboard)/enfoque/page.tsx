import { getActiveFocusSession, getFocusSettings, getTodayFocusProgress } from "@/lib/queries/focus";
import { getHabitNames } from "@/lib/queries/habits";
import { LIVE_STATUSES } from "@/lib/focus/compute";
import { getTodayDateString } from "@/lib/date";
import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { ContentHeader } from "@/components/nav/content-header";
import { FocusStartForm } from "@/components/focus/focus-start-form";
import { FocusTimerDisplay } from "@/components/focus/focus-timer-display";
import { FocusProgressWidget } from "@/components/focus/focus-progress-widget";
import { FocusGoalControl } from "@/components/focus/focus-goal-control";
import { FocusSoundToggle } from "@/components/focus/focus-sound-toggle";
import { FocusSecondaryLinks } from "@/components/focus/focus-secondary-links";

export default async function EnfoquePage({
  searchParams,
}: {
  searchParams: Promise<{ habitId?: string }>;
}) {
  const { habitId } = await searchParams;
  const cutoffHour = await getDayCutoffHour();
  const today = getTodayDateString(cutoffHour);

  const session = await getActiveFocusSession();
  const [settings, habitOptions, progress] = await Promise.all([
    getFocusSettings(),
    getHabitNames(),
    getTodayFocusProgress(today, session),
  ]);
  const isLive = session !== null && LIVE_STATUSES.includes(session.status);

  return (
    <div className="flex flex-1 flex-col">
      <ContentHeader titleKey="screens.enfoque.title" subtitleKey="screens.enfoque.subtitle" backHref="/" />

      <FocusProgressWidget completedSeconds={progress.completedSeconds} goalMinutes={progress.goalMinutes} />
      <div className="mb-6 flex flex-col gap-3">
        <FocusGoalControl goalMinutes={settings.dailyGoalMinutes} />
        <FocusSoundToggle enabled={settings.soundEnabled} />
      </div>

      {isLive && session ? (
        <FocusTimerDisplay session={session} soundEnabled={settings.soundEnabled} />
      ) : (
        <>
          <FocusStartForm settings={settings} habitOptions={habitOptions} defaultHabitId={habitId} />
          <FocusSecondaryLinks />
        </>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { ContentHeader } from "@/components/nav/content-header";
import { FocusStartForm } from "@/components/focus/focus-start-form";
import { FocusTimerDisplay } from "@/components/focus/focus-timer-display";
import { FocusProgressWidget } from "@/components/focus/focus-progress-widget";
import { FocusGoalControl } from "@/components/focus/focus-goal-control";
import { FocusSoundToggle } from "@/components/focus/focus-sound-toggle";
import { FocusSecondaryLinks } from "@/components/focus/focus-secondary-links";
import { LIVE_STATUSES } from "@/lib/focus/compute";
import { swrKeys } from "@/lib/swr/keys";
import { usePageData } from "@/lib/swr/use-page-data";
import { fetchFocusSupportingAction } from "@/lib/actions/focus-supporting-read";
import type { FocusSessionRow, FocusSettingsRow } from "@/lib/queries/focus";
import type { CategoryRow } from "@/lib/queries/habits";

export function FocusClient({
  session,
  settings: initialSettings,
  habitOptions: initialHabitOptions,
  categories: initialCategories,
  progress: initialProgress,
  today,
  defaultHabitId,
}: {
  session: FocusSessionRow | null;
  settings: FocusSettingsRow;
  habitOptions: { id: string; name: string; categoryId: string | null }[];
  categories: CategoryRow[];
  progress: { completedSeconds: number; goalMinutes: number };
  today: string;
  defaultHabitId?: string;
}) {
  const isLive = session !== null && LIVE_STATUSES.includes(session.status);

  const initialSupportingData = useMemo(
    () => ({ settings: initialSettings, habitOptions: initialHabitOptions, categories: initialCategories, progress: initialProgress }),
    [initialSettings, initialHabitOptions, initialCategories, initialProgress]
  );
  const { data } = usePageData(
    swrKeys.focusSupporting(today),
    () => fetchFocusSupportingAction(today),
    initialSupportingData
  );
  const { settings, habitOptions, categories, progress } = data;

  return (
    <div className="flex flex-1 flex-col">
      <ContentHeader titleKey="screens.enfoque.title" subtitleKey="screens.enfoque.subtitle" backHref="/" />

      {isLive && session ? (
        // With a session in progress, the screen is just the timer and its
        // actions — no daily goal, sound, or overall progress competing
        // for attention while focused.
        <FocusTimerDisplay session={session} soundEnabled={settings.soundEnabled} />
      ) : (
        <>
          <FocusProgressWidget completedSeconds={progress.completedSeconds} goalMinutes={progress.goalMinutes} />
          <div className="mb-6 flex flex-col gap-3">
            <FocusGoalControl goalMinutes={settings.dailyGoalMinutes} today={today} />
            <FocusSoundToggle enabled={settings.soundEnabled} today={today} />
          </div>
          <FocusStartForm
            settings={settings}
            habitOptions={habitOptions}
            categories={categories}
            defaultHabitId={defaultHabitId}
          />
          <FocusSecondaryLinks />
        </>
      )}
    </div>
  );
}

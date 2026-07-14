import { Suspense } from "react";
import { ContentHeader } from "@/components/nav/content-header";
import { DaySwitcher } from "@/components/habit/day-switcher";
import { TodaySummaryProvider } from "@/components/habit/today-summary-context";
import { TodaySummaryDisplay } from "@/components/habit/today-summary";
import { FocusHeaderChip } from "@/components/focus/focus-header-chip";
import { SkeletonHoyRows } from "@/components/ui/skeleton";
import { getServerToday } from "@/lib/settings/date-server";
import { getFocusHeaderData } from "@/lib/queries/focus";
import { TodayHabits } from "./today-habits";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** You can only view/log today or a past day — never the future. An invalid
 * or future date in the query silently falls back to today, instead of
 * propagating the dirty value into the queries. */
function resolveViewedDate(requested: string | undefined, today: string): string {
  if (requested && ISO_DATE.test(requested) && requested <= today) return requested;
  return today;
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha } = await searchParams;
  const today = await getServerToday();
  const date = resolveViewedDate(fecha, today);
  const focusHeader = await getFocusHeaderData();

  return (
    <TodaySummaryProvider>
      <div>
        <ContentHeader
          titleKey="screens.hoy.title"
          subtitleKey="screens.hoy.subtitle"
          headerAccessory={<FocusHeaderChip session={focusHeader.session} soundEnabled={focusHeader.soundEnabled} />}
        />
        <DaySwitcher date={date} today={today} />
        {/* TodaySummaryDisplay lives outside the <Suspense>: it doesn't
            remount when the day changes, so the % and streak don't reload —
            they keep showing the previous day's value and transition to the
            new one with a text scramble once TodayHabits reports them. */}
        <TodaySummaryDisplay />
        {/* key={date}: forces a new Suspense boundary per date so the habit
            list shows the skeleton while loading instead of leaving the
            previous day's content frozen on screen. */}
        <Suspense key={date} fallback={<SkeletonHoyRows />}>
          <TodayHabits date={date} today={today} />
        </Suspense>
      </div>
    </TodaySummaryProvider>
  );
}

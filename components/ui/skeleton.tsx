import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("animate-pulse rounded-md bg-border/70", className)} style={style} />;
}

/** Placeholders for ThemeToggle (3 icons in a pill) and LangToggle (ES/EN in
 * a pill) — same dimensions as the real components, see
 * components/nav/theme-toggle.tsx and lang-toggle.tsx. */
function SkeletonHeaderControls() {
  return (
    <div className="flex shrink-0 items-center gap-2 md:gap-3.5">
      <Skeleton className="h-[26px] w-[74px] rounded-full md:h-[30px] md:w-[86px]" />
      <Skeleton className="h-[26px] w-[58px] rounded-full md:h-[30px] md:w-[66px]" />
    </div>
  );
}

/** Mirror of ContentHeader (components/nav/content-header.tsx): same fixed
 * row (py-2.5) with the controls on the right, and the title below — large
 * and full-width for top-level screens, compact next to a back arrow for
 * subviews. Same padding (pb-5/md:pb-[22px]) as the real block so the
 * content doesn't jump in height when mounting. */
export function SkeletonContentHeader({ backHref = false }: { backHref?: boolean }) {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-bg py-2.5">
        {backHref ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <Skeleton className="h-[17px] w-[17px] shrink-0 rounded-full" />
            <Skeleton className="h-[17px] w-28" />
          </div>
        ) : (
          <div />
        )}
        <SkeletonHeaderControls />
      </div>
      <div className="pb-5 md:pb-[22px]">
        {!backHref && <Skeleton className="h-[26px] w-40" />}
        <Skeleton className={cn("h-3 w-48", !backHref && "mt-1")} />
      </div>
    </>
  );
}

/** Mirror of HabitCheckRow (components/habit/habit-check-row.tsx), the
 * Today habit row: avatar, name/subtitle, streak, "···" button and check
 * button — same gap-4/py-3.5 as the real row. */
export function SkeletonHabitCheckRow() {
  return (
    <div className="flex items-center gap-4 border-b border-border py-3.5">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full md:h-[42px] md:w-[42px]" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="mt-0.5 h-2.5 w-24" />
      </div>
      <div className="shrink-0">
        <Skeleton className="ml-auto h-4 w-5" />
        <Skeleton className="mt-1 ml-auto h-2 w-6" />
      </div>
      <Skeleton className="h-3 w-3 shrink-0 rounded-sm" />
      <Skeleton className="h-6 w-6 shrink-0 rounded-full md:h-7 md:w-7" />
    </div>
  );
}

/** Mirror of the data-dependent Today content (% summary + habit rows) —
 * used only by app/(dashboard)/loading.tsx, the cold-start fallback for the
 * whole page (nothing has rendered yet, not even the header). It no longer
 * applies for a day change within Today: the summary lives outside the
 * per-date <Suspense> (see TodaySummaryDisplay) so it can animate the
 * transition instead of showing a skeleton — see SkeletonHoyRows for that
 * case. */
export function SkeletonHoyList() {
  return (
    <div className="flex flex-col gap-4 md:gap-[22px]">
      <div>
        <Skeleton className="h-9 w-20" />
        <Skeleton className="mt-2.5 h-0.5 w-full md:mt-3" />
      </div>
      <SkeletonHoyRows />
    </div>
  );
}

/** Just the habit rows, without the % block — this is the fallback for the
 * <Suspense key={date}> in app/(dashboard)/page.tsx for a day change: at
 * that point the header, DaySwitcher and summary are already visible (the
 * old summary keeps animating its transition), so the only real gap to
 * cover is the habit list itself. */
export function SkeletonHoyRows() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonHabitCheckRow key={i} />
      ))}
    </div>
  );
}

/** Mirror of the inline row from HabitosClient (app/(dashboard)/habits/habits-client.tsx):
 * drag handle, smaller avatar than Today's, name/subtitle and status on the
 * right — same gap-2.5/py-3, deliberately different from
 * SkeletonHabitCheckRow because the real row is too. */
export function SkeletonHabitListRow() {
  return (
    <div className="flex items-center gap-2.5 border-b border-border py-3">
      <Skeleton className="h-3 w-3 shrink-0 rounded-sm" />
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-0.5 h-2.5 w-36" />
      </div>
      <Skeleton className="h-2.5 w-10 shrink-0" />
    </div>
  );
}

/** Rounded-border card (rounded-xl border p-4) shared by PeriodSummaryCard
 * and StreakProgress in Statistics/habit detail: header, big figure and
 * `lines` secondary rows. */
export function SkeletonStatCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-6 w-16" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-32" />
      ))}
    </div>
  );
}

/** Mirror of the cards from PatternsPanel (components/stats/patterns-panel.tsx). */
export function SkeletonPatternCard() {
  return (
    <div className="flex-1 rounded-xl border border-border p-3.5" style={{ minWidth: 180 }}>
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="mt-1.5 h-4 w-16" />
      <Skeleton className="mt-1 h-2.5 w-10" />
    </div>
  );
}

/** Mirror of a `Field` from HabitForm (components/habit/habit-form.tsx):
 * uppercase label + input, same gap-1.5. */
function SkeletonFormField({ width = "w-full" }: { width?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className={cn("h-10", width)} />
    </div>
  );
}

/** Mirror of the full HabitForm, used in the habit detail view. Same
 * gap-5 between fields as the real form; omits the conditional fields
 * (depending on goal/frequency type) because they vary by habit. */
export function SkeletonHabitForm() {
  return (
    <div className="flex flex-col gap-5">
      <SkeletonFormField />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-2.5 w-20" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[30px] w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex gap-5">
        <SkeletonFormField width="flex-1" />
        <SkeletonFormField width="flex-1" />
      </div>
      <SkeletonFormField />
      <SkeletonFormField width="w-32" />
      <SkeletonFormField width="w-24" />
      <SkeletonFormField width="w-32" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-28 rounded-lg" />
    </div>
  );
}

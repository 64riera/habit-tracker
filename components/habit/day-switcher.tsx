"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { addDays, parseISODate } from "@/lib/date";
import { cn } from "@/lib/utils";

/**
 * Navigates one day at a time from Today — never into the future (the next
 * button hides once today is reached). Reuses the same date-parameterized
 * check-in mechanism that already exists (HabitCheckRow, LogEditor,
 * RoutineQuickActions already receive `date` and don't distinguish whether
 * it's today or another day), so logging habits for a previous day is the
 * same UI as always, just with the date changed — no new screen or form.
 *
 * `shownDate` is optimistic state: even though this component lives outside
 * the <Suspense> that wraps the habit list (page.tsx), it's still part of
 * the Server Components tree — without this state, its own text (label,
 * "next" arrow, "Back to today" pill) would only update after the
 * round-trip to the server, the same visible delay already avoided for the
 * list. By keeping it in client state, it changes on the same tick as the
 * click; it resyncs with the `date` prop once the server confirms (in case
 * it was reached another way, like the browser's "back").
 */
export function DaySwitcher({ date, today }: { date: string; today: string }) {
  const { t, locale } = useI18n();
  const [shownDate, setShownDate] = useState(date);
  // Resyncs during render (not in an effect) if the prop confirmed by the
  // server changed through some way other than a click here (direct link,
  // browser "back") — the pattern React recommends for deriving state from
  // a prop without the extra frame of a useEffect.
  const [syncedDate, setSyncedDate] = useState(date);
  if (date !== syncedDate) {
    setSyncedDate(date);
    setShownDate(date);
  }

  const isToday = shownDate === today;
  const prev = addDays(shownDate, -1);
  const next = addDays(shownDate, 1);

  const label = isToday
    ? t("checkin.today")
    : new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(parseISODate(shownDate));

  return (
    // h-7: fixed height regardless of which children are present — the
    // "Back to today" pill (with border + padding) is taller than the
    // text-only label and than the arrows' layout area (which use -m-2/p-2
    // to expand the hit target without adding height), so without a
    // reserved height the row grows when the pill appears and pushes down
    // the % and streak from TodaySummaryDisplay, which sit right below.
    <div className="mb-4 flex h-7 items-center gap-1 md:mb-5">
      <Link
        href={`/?fecha=${prev}`}
        onClick={() => setShownDate(prev)}
        aria-label={t("checkin.previousDay")}
        className="-m-2 shrink-0 rounded-full p-2 text-muted"
      >
        <ChevronLeft size={15} strokeWidth={2.2} aria-hidden />
      </Link>

      <div className={cn("font-serif-italic text-[13px]", !isToday && "text-muted")}>{label}</div>

      {!isToday && (
        <Link
          href="/"
          onClick={() => setShownDate(today)}
          className="ml-1.5 shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted"
        >
          {t("checkin.backToToday")}
        </Link>
      )}

      {!isToday && (
        <Link
          href={`/?fecha=${next}`}
          onClick={() => setShownDate(next)}
          aria-label={t("checkin.nextDay")}
          className="-m-2 ml-auto shrink-0 rounded-full p-2 text-muted"
        >
          <ChevronRight size={15} strokeWidth={2.2} aria-hidden />
        </Link>
      )}
    </div>
  );
}

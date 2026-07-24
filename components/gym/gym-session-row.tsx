"use client";

import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { categoryDisplayName } from "@/lib/habits/describe";
import { PendingSyncBadge } from "@/components/offline/pending-sync-badge";
import type { GymSessionRow as GymSession } from "@/lib/queries/gym";
import type { GymExerciseCatalogRow } from "@/lib/queries/gym-exercises";

export function GymSessionRow({
  session,
  exercisesById,
  isPendingSync,
  showDivider = true,
}: {
  session: GymSession;
  exercisesById: Map<string, GymExerciseCatalogRow>;
  isPendingSync?: boolean;
  showDivider?: boolean;
}) {
  const { t, locale } = useI18n();
  const names = session.exercises.map((e) => categoryDisplayName(exercisesById.get(e.exerciseId), locale)).filter(Boolean);
  const preview = names.slice(0, 3).join(", ") + (names.length > 3 ? ` +${names.length - 3}` : "");
  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const summary =
    t("gym.summary", { exercises: session.exercises.length, sets: totalSets }) +
    (session.cardioMinutes ? ` · ${t("gym.cardioSummary", { min: session.cardioMinutes })}` : "");

  return (
    <Link
      href={`/gym/${session.id}`}
      className={cn("flex items-center gap-3 py-3", showDivider && "border-b border-border")}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: "color-mix(in oklch, var(--color-cat-fitness) 16%, transparent)", color: "var(--color-cat-fitness)" }}
        aria-hidden
      >
        <Dumbbell size={16} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold">
          <span className="truncate">{preview || t("gym.empty")}</span>
          {isPendingSync && <PendingSyncBadge />}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted">{summary}</span>
      </span>
    </Link>
  );
}

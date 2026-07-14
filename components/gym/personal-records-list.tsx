"use client";

import { useI18n } from "@/lib/i18n/client";
import type { GymExerciseStat } from "@/lib/gym/stats";

export type PersonalRecordEntry = GymExerciseStat & { name: string };

export function PersonalRecordsList({ records }: { records: PersonalRecordEntry[] }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col">
      {records.map((r) => (
        <div key={r.exerciseId} className="flex items-center justify-between border-b border-border py-2.5 last:border-b-0">
          <span className="min-w-0 truncate pr-3 text-[13px] font-medium">{r.name}</span>
          <span className="shrink-0 text-[12.5px] tabular-nums text-muted">
            {r.bestWeight !== null ? `${r.bestWeight} kg × ${r.bestReps}` : `${r.bestReps} ${t("gym.stats.reps")}`}
          </span>
        </div>
      ))}
    </div>
  );
}

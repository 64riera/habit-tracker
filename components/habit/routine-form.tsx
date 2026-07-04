"use client";

import { useI18n } from "@/lib/i18n/client";
import type { RoutineWithHabits } from "@/lib/queries/routines";

export function RoutineForm({
  action,
  habits,
  routine,
}: {
  action: (formData: FormData) => void | Promise<void>;
  habits: { id: string; name: string }[];
  routine?: RoutineWithHabits;
}) {
  const { t } = useI18n();
  const selectedIds = new Set(routine?.habitIds ?? []);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] tracking-wide text-muted uppercase">
          {t("routines.fieldName")}
        </div>
        <input
          name="name"
          required
          maxLength={60}
          defaultValue={routine?.name ?? ""}
          className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-text"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] tracking-wide text-muted uppercase">
          {t("habit.fieldName")}
        </div>
        <div className="flex flex-col gap-1.5">
          {habits.map((h) => (
            <label key={h.id} className="flex items-center gap-2.5 text-[13px]">
              <input type="checkbox" name="habitIds" value={h.id} defaultChecked={selectedIds.has(h.id)} />
              {h.name}
            </label>
          ))}
          {habits.length === 0 && <p className="text-xs text-muted">{t("habit.empty")}</p>}
        </div>
      </div>
      <button
        type="submit"
        className="w-fit rounded-lg bg-text px-4 py-2 text-[12.5px] font-semibold text-surface"
      >
        {t("common.save")}
      </button>
    </form>
  );
}

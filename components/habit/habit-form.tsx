"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { parseFrequencyConfig } from "@/lib/habits/frequency";
import { cn } from "@/lib/utils";
import type { CategoryRow, HabitWithExtras } from "@/lib/queries/habits";
import { toISODate } from "@/lib/date";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  categories: CategoryRow[];
  habit?: HabitWithExtras;
};

const GOAL_TYPES = ["binary", "quantitative", "duration"] as const;
const FREQ_TYPES = ["daily", "weekdays", "x_per_week", "x_per_month", "custom_interval"] as const;

export function HabitForm({ action, categories, habit }: Props) {
  const { t, locale } = useI18n();
  const cfg = parseFrequencyConfig(habit?.frequencyConfig ?? null);

  const [goalType, setGoalType] = useState(habit?.goalType ?? "binary");
  const [frequencyType, setFrequencyType] = useState(habit?.frequencyType ?? "daily");
  const [categoryId, setCategoryId] = useState(habit?.categoryId ?? categories[0]?.id ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(cfg.days ?? [1, 2, 3, 4, 5]);
  const [hardMode, setHardMode] = useState(habit?.hardMode ?? false);
  const [isPinned, setIsPinned] = useState(habit?.isPinned ?? false);

  return (
    <form action={action} className="flex flex-1 flex-col gap-5 min-w-0">
      <div className="text-sm font-semibold">
        {habit ? t("habit.editHabit") : t("habit.newHabit")}
      </div>

      <Field label={t("habit.fieldName")}>
        <input
          name="name"
          defaultValue={habit?.name ?? ""}
          required
          maxLength={80}
          className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-text"
        />
      </Field>

      <Field label={t("habit.fieldCategory")}>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => {
            const active = categoryId === c.id;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className="rounded-full border px-3 py-1.5 text-[11px] font-medium"
                style={{
                  background: active ? "var(--color-text)" : "transparent",
                  color: active ? "var(--color-surface)" : "var(--color-muted)",
                  borderColor: active ? "var(--color-text)" : "var(--color-border)",
                }}
              >
                {categoryDisplayName(c, locale)}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="categoryId" value={categoryId} />
      </Field>

      <div className="flex gap-5">
        <Field label={t("habit.fieldGoalType")} className="flex-1">
          <div className="flex overflow-hidden rounded-lg border border-border">
            {GOAL_TYPES.map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => setGoalType(g)}
                className="flex-1 px-1 py-2 text-[11px] font-medium"
                style={{
                  background: goalType === g ? "var(--color-text)" : "transparent",
                  color: goalType === g ? "var(--color-surface)" : "var(--color-muted)",
                }}
              >
                {t(`habit.goalType.${g}`)}
              </button>
            ))}
          </div>
          <input type="hidden" name="goalType" value={goalType} />
        </Field>

        {goalType !== "binary" && (
          <Field label={t("habit.fieldGoal")} className="flex-1">
            <div className="flex gap-2">
              <input
                name="goalTarget"
                type="number"
                min={1}
                step="any"
                defaultValue={habit?.goalTarget ?? 20}
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
              />
              <input
                name="goalUnit"
                placeholder={t("habit.fieldGoalUnit")}
                defaultValue={habit?.goalUnit ?? (goalType === "duration" ? "min" : "")}
                className="w-24 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
              />
            </div>
          </Field>
        )}
      </div>

      <Field label={t("habit.fieldFrequency")}>
        <select
          name="frequencyType"
          value={frequencyType}
          onChange={(e) => setFrequencyType(e.target.value as typeof frequencyType)}
          className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
        >
          {FREQ_TYPES.map((f) => (
            <option key={f} value={f}>
              {t(`habit.frequency.${f}`)}
            </option>
          ))}
        </select>

        {frequencyType === "weekdays" && (
          <div className="mt-2 flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const on = weekdays.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() =>
                    setWeekdays((prev) =>
                      on ? prev.filter((x) => x !== d) : [...prev, d].sort()
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold"
                  style={{
                    background: on ? "var(--color-text)" : "transparent",
                    color: on ? "var(--color-surface)" : "var(--color-muted)",
                    borderColor: on ? "var(--color-text)" : "var(--color-border)",
                  }}
                >
                  {t(`habit.weekdayShort.${d}`)}
                </button>
              );
            })}
            {weekdays.map((d) => (
              <input key={d} type="hidden" name="weekdays" value={d} />
            ))}
          </div>
        )}

        {(frequencyType === "x_per_week" || frequencyType === "x_per_month") && (
          <input
            name="timesPerPeriod"
            type="number"
            min={1}
            max={30}
            defaultValue={cfg.timesPerPeriod ?? 3}
            className="mt-2 w-24 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
          />
        )}

        {frequencyType === "custom_interval" && (
          <input
            name="intervalDays"
            type="number"
            min={1}
            max={60}
            defaultValue={cfg.intervalDays ?? 2}
            className="mt-2 w-24 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
          />
        )}
      </Field>

      <div className="flex gap-5">
        <Field label={t("habit.fieldReminder")} className="flex-1">
          <input
            name="reminderTime"
            type="time"
            defaultValue={
              habit?.reminders ? (JSON.parse(habit.reminders) as string[])[0] : ""
            }
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
          />
        </Field>

        <div className="flex items-center gap-2.5 pt-6">
          <span className="text-[11.5px]">{t("habit.fieldHardMode")}</span>
          <button
            type="button"
            onClick={() => setHardMode((v) => !v)}
            className="flex h-[19px] w-[34px] items-center rounded-full bg-border p-[2px]"
            style={{ justifyContent: hardMode ? "flex-end" : "flex-start" }}
          >
            <span
              className="h-[15px] w-[15px] rounded-full"
              style={{ background: hardMode ? "var(--color-accent)" : "var(--color-muted)" }}
            />
          </button>
          <input type="hidden" name="hardMode" value={hardMode ? "on" : ""} />
        </div>
      </div>

      <Field label={t("habit.fieldSkipDays")}>
        <input
          name="skipDaysAllowed"
          type="number"
          min={0}
          max={10}
          defaultValue={habit?.skipDaysAllowed ?? 0}
          className="w-24 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
        />
      </Field>

      <Field label={t("habit.fieldStartDate")}>
        <input
          name="startDate"
          type="date"
          defaultValue={habit?.startDate ?? toISODate(new Date())}
          required
          className="w-fit rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
        />
      </Field>

      <label className="flex items-center gap-2 text-[11.5px]">
        <input
          type="checkbox"
          checked={isPinned}
          onChange={(e) => setIsPinned(e.target.checked)}
          className="accent-text"
        />
        {t("habit.pin")}
        <input type="hidden" name="isPinned" value={isPinned ? "on" : ""} />
      </label>

      <div className="mt-auto flex items-center gap-2.5 pt-3">
        <button
          type="submit"
          className="rounded-lg bg-text px-5 py-2.5 text-[12.5px] font-semibold text-surface"
        >
          {t("common.save")}
        </button>
      </div>
    </form>
  );
}

export function ArchiveHabitButton({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <form action={action}>
      <button type="submit" className="px-4 py-2.5 text-[12.5px] text-muted">
        {t("common.archive")}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="text-[10px] tracking-wide text-muted uppercase">{label}</div>
      {children}
    </div>
  );
}

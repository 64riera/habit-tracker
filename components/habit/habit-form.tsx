"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { nanoid } from "nanoid";
import { Archive, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { usePushSubscription } from "@/lib/hooks/use-push-subscription";
import { useConfirmAction } from "@/lib/hooks/use-confirm-action";
import { categoryDisplayName } from "@/lib/habits/describe";
import { parseFrequencyConfig } from "@/lib/habits/frequency";
import type { CategoryRow, HabitWithExtras } from "@/lib/queries/habits";
import { createHabit, updateHabit, archiveHabit, restoreHabit } from "@/lib/actions/habits";
import { habitFormSchema, extractHabitFields } from "@/lib/validation/habit";
import { useOfflineFormAction, useOfflineIdAction } from "@/lib/offline/form";
import { toISODate } from "@/lib/date";
import { Select } from "@/components/ui/select";
import { FormAlert, Field } from "@/components/ui/form-primitives";
import { PillTabs } from "@/components/ui/pill-tabs";

type Props = {
  categories: CategoryRow[];
  habit?: HabitWithExtras;
};

const GOAL_TYPES = ["binary", "quantitative", "duration"] as const;
const FREQ_TYPES = ["daily", "weekdays", "x_per_week", "x_per_month", "custom_interval"] as const;

export function HabitForm({ categories, habit }: Props) {
  const { t, locale } = useI18n();
  const { subscribed, subscribe } = usePushSubscription();
  const cfg = parseFrequencyConfig(habit?.frequencyConfig ?? null);
  const [id] = useState(() => habit?.id ?? nanoid());
  const action = useOfflineFormAction({
    schema: habitFormSchema,
    extractFields: extractHabitFields,
    buildMutation: (id, values) =>
      habit ? { type: "updateHabit", habitId: habit.id, values } : { type: "createHabit", id, values },
    onlineAction: habit ? (prevState, formData) => updateHabit(habit.id, prevState, formData) : createHabit,
  });
  const [state, formAction] = useActionState(action, {});

  const [goalType, setGoalType] = useState(habit?.goalType ?? "binary");
  const [frequencyType, setFrequencyType] = useState(habit?.frequencyType ?? "daily");
  const [categoryId, setCategoryId] = useState(habit?.categoryId ?? categories[0]?.id ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(cfg.days ?? [1, 2, 3, 4, 5]);

  return (
    <form action={formAction} className="flex flex-1 flex-col min-w-0">
      <input type="hidden" name="id" value={id} />

      <FormAlert error={state.error ? t("habit.formError") : undefined} queued={state.queued} className="mb-5" />

      {/* 2-column grid on desktop: short fields (frequency + reminder, start
          date + pin, etc.) share a row instead of stacking one below the
          other, so the form makes use of the available width and fits
          without scrolling on most screens. Fields that need the full
          width (name, category, frequency with its sub-controls) use
          md:col-span-2. */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
        <Field label={t("habit.fieldName")} htmlFor="habit-name" className="md:col-span-2">
          <input
            id="habit-name"
            name="name"
            defaultValue={habit?.name ?? ""}
            required
            maxLength={80}
            className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-text"
          />
        </Field>

        <Field label={t("habit.fieldCategory")} className="md:col-span-2">
          <div role="group" aria-label={t("habit.fieldCategory")} className="flex flex-wrap gap-1.5">
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

        <Field label={t("habit.fieldGoalType")} className={goalType === "binary" ? "md:col-span-2" : undefined}>
          <PillTabs
            options={GOAL_TYPES.map((g) => ({ value: g, label: t(`habit.goalType.${g}`) }))}
            value={goalType}
            onChange={setGoalType}
            ariaLabel={t("habit.fieldGoalType")}
          />
          <input type="hidden" name="goalType" value={goalType} />
          <p className="text-[11px] text-muted">{t(`habit.goalTypeHelp.${goalType}`)}</p>
        </Field>

        {goalType !== "binary" && (
          <Field label={t("habit.fieldGoal")} htmlFor="habit-goal-target">
            <div className="flex gap-2">
              <input
                id="habit-goal-target"
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
                aria-label={t("habit.fieldGoalUnit")}
                defaultValue={habit?.goalUnit ?? (goalType === "duration" ? "min" : "")}
                className="w-24 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
              />
            </div>
          </Field>
        )}

        <Field label={t("habit.fieldFrequency")} className="md:col-span-2">
          <Select
            variant="field"
            className="md:w-64"
            value={frequencyType}
            onValueChange={(v) => setFrequencyType(v as typeof frequencyType)}
            options={FREQ_TYPES.map((f) => ({ value: f, label: t(`habit.frequency.${f}`) }))}
            ariaLabel={t("habit.fieldFrequency")}
          />
          <input type="hidden" name="frequencyType" value={frequencyType} />

          {frequencyType === "weekdays" && (
            <div role="group" aria-label={t("habit.frequency.weekdays")} className="mt-2 flex gap-1.5">
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
              aria-label={t(`habit.frequency.${frequencyType}`)}
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
              aria-label={t("habit.frequency.custom_interval")}
              defaultValue={cfg.intervalDays ?? 2}
              className="mt-2 w-24 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
            />
          )}
        </Field>

        <Field label={t("habit.fieldReminder")} htmlFor="habit-reminder-time">
          <input
            id="habit-reminder-time"
            name="reminderTime"
            type="time"
            defaultValue={
              habit?.reminders ? (JSON.parse(habit.reminders) as string[])[0] : ""
            }
            // Ask for notification permission here, not earlier: this is the
            // moment the user expresses they want to be notified, so the
            // request arrives with context instead of blindly on app open.
            onChange={(e) => {
              if (e.target.value && !subscribed) subscribe();
            }}
            className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-text md:w-fit"
          />
        </Field>

        <Field label={t("habit.fieldSkipDays")} htmlFor="habit-skip-days">
          <input
            id="habit-skip-days"
            name="skipDaysAllowed"
            type="number"
            min={0}
            max={10}
            defaultValue={habit?.skipDaysAllowed ?? 0}
            className="w-24 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
          />
          <p className="text-[11px] text-muted">{t("habit.fieldSkipDaysHelp")}</p>
        </Field>

        <Field label={t("habit.fieldStartDate")} htmlFor="habit-start-date">
          <input
            id="habit-start-date"
            name="startDate"
            type="date"
            defaultValue={habit?.startDate ?? toISODate(new Date())}
            required
            className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-text md:w-fit"
          />
        </Field>
      </div>

      {/* hardMode is preserved without exposing a control: today it doesn't
          change any calculation (streak, freezes, free days), so a toggle
          with no real effect would only cause confusion — see discussion
          with the user. */}
      <input type="hidden" name="hardMode" value={habit?.hardMode ? "on" : ""} />
      {/* isPinned is preserved without exposing a control in the form: it's
          pinned via the swipe gesture in the habit list (see
          habitos-client.tsx), so here we just avoid overwriting the
          existing value on save. */}
      <input type="hidden" name="isPinned" value={habit?.isPinned ? "on" : ""} />

      <div className="mt-auto flex items-center gap-2.5 pt-6">
        <SaveButton label={t("common.save")} loadingLabel={t("common.loading")} />
      </div>
    </form>
  );
}

function SaveButton({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-text px-5 py-2.5 text-[12.5px] font-semibold text-surface disabled:opacity-60"
    >
      {pending ? loadingLabel : label}
    </button>
  );
}

/**
 * On the detail page: archives (if the habit is active) or restores (if it's
 * already archived). It's the only restore entry point outside the list's
 * swipe gesture, so it covers users who can't or don't know how to use it.
 */
export function ArchiveHabitButton({ habitId, status }: { habitId: string; status: string }) {
  const { t } = useI18n();
  const isArchived = status === "archived";
  const action = useOfflineIdAction({
    onlineAction: () => (isArchived ? restoreHabit(habitId) : archiveHabit(habitId)),
    buildMutation: () =>
      isArchived ? { type: "restoreHabit", habitId } : { type: "archiveHabit", habitId },
  });
  const formRef = useRef<HTMLFormElement>(null);
  const { requestConfirm, dialog } = useConfirmAction();

  const icon = isArchived ? <RotateCcw size={13} strokeWidth={2} aria-hidden /> : <Archive size={13} strokeWidth={2} aria-hidden />;
  const label = isArchived ? t("habit.restore") : t("common.archive");

  if (isArchived) {
    return (
      <form action={action}>
        <ArchiveSubmitButton label={label} loadingLabel={t("common.loading")} icon={icon} />
      </form>
    );
  }

  return (
    <form ref={formRef} action={action}>
      <ArchiveSubmitButton
        label={label}
        loadingLabel={t("common.loading")}
        icon={icon}
        onConfirmSubmit={() =>
          requestConfirm({
            title: t("common.confirm"),
            description: t("habit.deleteConfirm"),
            confirmLabel: t("common.archive"),
            cancelLabel: t("common.cancel"),
            onConfirm: () => formRef.current?.requestSubmit(),
          })
        }
      />
      {dialog}
    </form>
  );
}

function ArchiveSubmitButton({
  label,
  loadingLabel,
  icon,
  onConfirmSubmit,
}: {
  label: string;
  loadingLabel: string;
  icon: React.ReactNode;
  /** When set, the button asks for confirmation instead of submitting the form directly
   * (archiving a habit is destructive; restoring isn't, see the caller). */
  onConfirmSubmit?: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type={onConfirmSubmit ? "button" : "submit"}
      onClick={onConfirmSubmit}
      disabled={pending}
      className="flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] text-muted disabled:opacity-60"
    >
      {icon}
      {pending ? loadingLabel : label}
    </button>
  );
}

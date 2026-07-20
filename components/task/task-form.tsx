"use client";

import { useActionState, useState } from "react";
import { nanoid } from "nanoid";
import { useI18n } from "@/lib/i18n/client";
import { Select } from "@/components/ui/select";
import type { TaskRow } from "@/lib/queries/tasks";
import { parseTaskRecurrenceConfig, type TaskRecurrenceType } from "@/lib/tasks/recurrence";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { taskFormSchema, extractTaskFields } from "@/lib/validation/task";
import { useOfflineFormAction } from "@/lib/offline/form";
import { FormAlert, StickySaveBar, Field } from "@/components/ui/form-primitives";
import { PillTabs } from "@/components/ui/pill-tabs";

const PILLS = ["daily", "weekly", "monthly", "yearly", "custom"] as const;
type Pill = (typeof PILLS)[number];
const CUSTOM_MODES = ["custom_interval", "custom_weekdays"] as const;
type CustomMode = (typeof CUSTOM_MODES)[number];
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function pillFor(recurrenceType: string): Pill {
  return recurrenceType === "custom_interval" || recurrenceType === "custom_weekdays" ? "custom" : (recurrenceType as Pill);
}

export function TaskForm({ task }: { task?: TaskRow }) {
  const { t } = useI18n();
  const cfg = parseTaskRecurrenceConfig(task?.recurrenceConfig ?? null);

  const [id] = useState(() => task?.id ?? nanoid());
  const [pill, setPill] = useState<Pill>(() => pillFor(task?.recurrenceType ?? "daily"));
  const [customMode, setCustomMode] = useState<CustomMode>(
    () => (task?.recurrenceType === "custom_weekdays" ? "custom_weekdays" : "custom_interval")
  );
  const [dayOfMonth, setDayOfMonth] = useState(cfg.dayOfMonth ?? 1);
  const [month, setMonth] = useState(cfg.month ?? 1);
  const [day, setDay] = useState(cfg.day ?? 1);
  const [intervalDays, setIntervalDays] = useState(cfg.intervalDays ?? 3);
  const [weekdays, setWeekdays] = useState<number[]>(cfg.weekdays ?? []);

  const recurrenceType: TaskRecurrenceType = pill === "custom" ? customMode : pill;

  const action = useOfflineFormAction({
    schema: taskFormSchema,
    extractFields: extractTaskFields,
    buildMutation: (id, values) =>
      task ? { type: "updateTask", taskId: task.id, values } : { type: "createTask", id, values },
    onlineAction: task ? (prevState, formData) => updateTask(task.id, prevState, formData) : createTask,
  });
  const [state, formAction] = useActionState(action, {});

  function toggleWeekday(d: number) {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="recurrenceType" value={recurrenceType} />

      <FormAlert error={state.error ? t("tasks.formError") : undefined} queued={state.queued} />

      <Field label={t("tasks.fieldTitle")}>
        <input
          name="title"
          required
          maxLength={80}
          defaultValue={task?.title ?? ""}
          className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-text"
        />
      </Field>

      <Field label={t("tasks.fieldRecurrence")}>
        <PillTabs
          options={PILLS.map((p) => ({ value: p, label: t(`tasks.recurrence.${p}`) }))}
          value={pill}
          onChange={setPill}
          ariaLabel={t("tasks.fieldRecurrence")}
        />
      </Field>

      {pill === "custom" && (
        <Field label={t("tasks.recurrence.custom")}>
          <div className="flex w-fit overflow-hidden rounded-full border border-border">
            {CUSTOM_MODES.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setCustomMode(m)}
                className="px-3 py-1.5 text-[11px] font-medium"
                style={{
                  background: customMode === m ? "var(--color-text)" : "transparent",
                  color: customMode === m ? "var(--color-surface)" : "var(--color-muted)",
                }}
              >
                {t(`tasks.customMode.${m === "custom_interval" ? "interval" : "weekdays"}`)}
              </button>
            ))}
          </div>
        </Field>
      )}

      {pill === "monthly" && (
        <Field label={t("tasks.fieldDayOfMonth")}>
          <input
            name="dayOfMonth"
            type="number"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-text md:w-24"
          />
        </Field>
      )}

      {pill === "yearly" && (
        <div className="flex gap-2">
          <Field label={t("tasks.fieldMonth")}>
            <Select
              variant="field"
              className="w-36"
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
              options={MONTHS.map((m) => ({ value: String(m), label: t(`tasks.monthLong.${m}`) }))}
            />
            <input type="hidden" name="month" value={month} />
          </Field>
          <Field label={t("tasks.fieldDay")}>
            <input
              name="day"
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-20 rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-text"
            />
          </Field>
        </div>
      )}

      {pill === "custom" && customMode === "custom_interval" && (
        <Field label={t("tasks.fieldIntervalDays")}>
          <input
            name="intervalDays"
            type="number"
            min={1}
            max={365}
            value={intervalDays}
            onChange={(e) => setIntervalDays(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-text md:w-24"
          />
        </Field>
      )}

      {pill === "custom" && customMode === "custom_weekdays" && (
        <Field label={t("tasks.fieldWeekdays")}>
          <div className="flex gap-1.5">
            {WEEKDAYS.map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => toggleWeekday(d)}
                className="flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-medium"
                style={{
                  background: weekdays.includes(d) ? "var(--color-text)" : "transparent",
                  color: weekdays.includes(d) ? "var(--color-surface)" : "var(--color-muted)",
                  borderColor: weekdays.includes(d) ? "var(--color-text)" : "var(--color-border)",
                }}
              >
                {t(`habit.weekdayShort.${d}`)}
              </button>
            ))}
            {weekdays.map((d) => (
              <input key={d} type="hidden" name="weekdays" value={d} />
            ))}
          </div>
        </Field>
      )}

      <StickySaveBar label={t("common.save")} loadingLabel={t("common.loading")} />
    </form>
  );
}

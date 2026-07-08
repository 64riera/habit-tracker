"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { nanoid } from "nanoid";
import { Archive, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { parseFrequencyConfig } from "@/lib/habits/frequency";
import { cn } from "@/lib/utils";
import type { CategoryRow, HabitWithExtras } from "@/lib/queries/habits";
import { createHabit, updateHabit, archiveHabit, restoreHabit } from "@/lib/actions/habits";
import { habitFormSchema, extractHabitFields } from "@/lib/validation/habit";
import { useOfflineFormAction, useOfflineIdAction } from "@/lib/offline/form";
import { toISODate } from "@/lib/date";
import { Select } from "@/components/ui/select";

type Props = {
  categories: CategoryRow[];
  habit?: HabitWithExtras;
};

const GOAL_TYPES = ["binary", "quantitative", "duration"] as const;
const FREQ_TYPES = ["daily", "weekdays", "x_per_week", "x_per_month", "custom_interval"] as const;

export function HabitForm({ categories, habit }: Props) {
  const { t, locale } = useI18n();
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
  const [isPinned, setIsPinned] = useState(habit?.isPinned ?? false);

  return (
    <form action={formAction} className="flex flex-1 flex-col min-w-0">
      <input type="hidden" name="id" value={id} />

      {state.error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-cat-fitness/40 px-3.5 py-2.5 text-[12px] text-cat-fitness"
        >
          {t("habit.formError")}
        </div>
      )}

      {state.queued && (
        <div role="status" className="mb-5 rounded-lg border border-border px-3.5 py-2.5 text-[12px] text-muted">
          {t("offline.savedOffline")}
        </div>
      )}

      {/* Grid de 2 columnas en desktop: los campos cortos (frecuencia +
          recordatorio, fecha de inicio + destacar, etc.) comparten fila en
          vez de apilarse uno debajo del otro, así que el formulario
          aprovecha el ancho disponible y cabe sin scroll en la mayoría de
          pantallas. Los campos que necesitan todo el ancho (nombre,
          categoría, frecuencia con sus subcontroles) usan md:col-span-2. */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
        <Field label={t("habit.fieldName")} className="md:col-span-2">
          <input
            name="name"
            defaultValue={habit?.name ?? ""}
            required
            maxLength={80}
            className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-text"
          />
        </Field>

        <Field label={t("habit.fieldCategory")} className="md:col-span-2">
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

        <Field label={t("habit.fieldGoalType")} className={goalType === "binary" ? "md:col-span-2" : undefined}>
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
          <p className="text-[11px] text-muted">{t(`habit.goalTypeHelp.${goalType}`)}</p>
        </Field>

        {goalType !== "binary" && (
          <Field label={t("habit.fieldGoal")}>
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

        <Field label={t("habit.fieldFrequency")} className="md:col-span-2">
          <Select
            variant="field"
            className="md:w-64"
            value={frequencyType}
            onValueChange={(v) => setFrequencyType(v as typeof frequencyType)}
            options={FREQ_TYPES.map((f) => ({ value: f, label: t(`habit.frequency.${f}`) }))}
          />
          <input type="hidden" name="frequencyType" value={frequencyType} />

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

        <Field label={t("habit.fieldReminder")}>
          <input
            name="reminderTime"
            type="time"
            defaultValue={
              habit?.reminders ? (JSON.parse(habit.reminders) as string[])[0] : ""
            }
            className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-text md:w-fit"
          />
        </Field>

        <Field label={t("habit.fieldSkipDays")}>
          <input
            name="skipDaysAllowed"
            type="number"
            min={0}
            max={10}
            defaultValue={habit?.skipDaysAllowed ?? 0}
            className="w-24 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
          />
          <p className="text-[11px] text-muted">{t("habit.fieldSkipDaysHelp")}</p>
        </Field>

        <Field label={t("habit.fieldStartDate")}>
          <input
            name="startDate"
            type="date"
            defaultValue={habit?.startDate ?? toISODate(new Date())}
            required
            className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-text md:w-fit"
          />
        </Field>

        <label className="flex items-center gap-2 text-[11.5px] md:self-end md:pb-2.5">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="accent-text"
          />
          {t("habit.pin")}
          <input type="hidden" name="isPinned" value={isPinned ? "on" : ""} />
        </label>
      </div>

      {/* hardMode se preserva sin exponer control: hoy no cambia ningún cálculo
          (racha, comodines, días libres), así que un interruptor sin efecto
          real solo genera confusión — ver discusión con el usuario. */}
      <input type="hidden" name="hardMode" value={habit?.hardMode ? "on" : ""} />

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
 * En la página de detalle: archiva (si el hábito está activo) o restaura (si ya
 * está archivado). Es el único punto de restauración fuera del swipe de la lista,
 * así que cubre a quien no puede o no sabe usar el gesto.
 */
export function ArchiveHabitButton({ habitId, status }: { habitId: string; status: string }) {
  const { t } = useI18n();
  const isArchived = status === "archived";
  const action = useOfflineIdAction({
    onlineAction: () => (isArchived ? restoreHabit(habitId) : archiveHabit(habitId)),
    buildMutation: () =>
      isArchived ? { type: "restoreHabit", habitId } : { type: "archiveHabit", habitId },
  });
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!isArchived && !confirm(t("habit.deleteConfirm"))) e.preventDefault();
      }}
    >
      <ArchiveSubmitButton
        label={isArchived ? t("habit.restore") : t("common.archive")}
        loadingLabel={t("common.loading")}
        icon={isArchived ? <RotateCcw size={13} strokeWidth={2} aria-hidden /> : <Archive size={13} strokeWidth={2} aria-hidden />}
      />
    </form>
  );
}

function ArchiveSubmitButton({
  label,
  loadingLabel,
  icon,
}: {
  label: string;
  loadingLabel: string;
  icon: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] text-muted disabled:opacity-60"
    >
      {icon}
      {pending ? loadingLabel : label}
    </button>
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

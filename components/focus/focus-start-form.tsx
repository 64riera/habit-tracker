"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Play } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { categoryDisplayName } from "@/lib/habits/describe";
import { startFocusSessionForm, type StartFocusSessionFormState } from "@/lib/actions/focus";
import { FocusDurationDial } from "@/components/focus/focus-duration-dial";
import {
  BREAK_DURATION_MAX_MINUTES,
  BREAK_DURATION_MIN_MINUTES,
  BREAK_INTERVAL_MAX_MINUTES,
  BREAK_INTERVAL_MIN_MINUTES,
  COUNTDOWN_MAX_MINUTES,
  COUNTDOWN_MIN_MINUTES,
} from "@/lib/focus/compute";
import type { FocusSettingsRow } from "@/lib/queries/focus";
import type { CategoryRow } from "@/lib/queries/habits";

type Props = {
  settings: FocusSettingsRow;
  habitOptions: { id: string; name: string; categoryId: string | null }[];
  categories: CategoryRow[];
  defaultHabitId?: string;
};

const INITIAL_STATE: StartFocusSessionFormState = {};
const MODES = ["countdown", "stopwatch"] as const;
// Radix Select doesn't allow a <Select.Item value=""> (that value is
// reserved internally for "no selection" and breaks the text shown in the
// trigger) — a non-empty sentinel avoids the bug; it never leaves this
// component, it's translated back to "" before sending it to the form.
const NONE = "__none__";

export function FocusStartForm({ settings, habitOptions, categories, defaultHabitId }: Props) {
  const { t, locale } = useI18n();
  const [state, formAction] = useActionState(startFocusSessionForm, INITIAL_STATE);
  const [mode, setMode] = useState<(typeof MODES)[number]>(settings.defaultMode);
  const [durationMinutes, setDurationMinutes] = useState(settings.defaultDurationMinutes);
  const [breaksEnabled, setBreaksEnabled] = useState(settings.breaksEnabled);
  const [habitId, setHabitId] = useState(defaultHabitId || NONE);
  // Defaults to "General" (falls back to the first visible category if
  // General was hidden) — same "always exactly one selected" chip pattern
  // as the category picker in habit-form.tsx, no separate "none" pill.
  const generalCategory = categories.find((c) => c.nameEs === "General");
  const [categoryId, setCategoryId] = useState(generalCategory?.id ?? categories[0]?.id ?? "");

  const habitSelectOptions = [
    { value: NONE, label: t("focus.habit.none") },
    ...habitOptions.map((h) => ({ value: h.id, label: h.name })),
  ];
  const submittedHabitId = habitId === NONE ? "" : habitId;

  // Linking to a habit already implies a category (the habit's own): instead
  // of asking for it twice (and risking a mismatch), the manual category
  // picker is replaced by a read-only indicator while a habit is selected.
  // See resolveFocusAttribution in lib/actions/focus.ts, which also
  // re-derives it on the server without trusting the client.
  const linkedHabit = submittedHabitId ? habitOptions.find((h) => h.id === submittedHabitId) : undefined;
  const linkedCategory = linkedHabit?.categoryId
    ? categories.find((c) => c.id === linkedHabit.categoryId)
    : undefined;
  const effectiveCategoryId = linkedHabit ? (linkedCategory?.id ?? "") : categoryId;

  return (
    <form action={formAction} className="flex flex-1 flex-col min-w-0">
      {state.error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-cat-fitness/40 px-3.5 py-2.5 text-[12px] text-cat-fitness"
        >
          {t("focus.formError")}
        </div>
      )}

      <div className="flex flex-col gap-5">
        <Field label={t("focus.mode.label")}>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {MODES.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 px-1 py-2.5 text-[12px] font-medium"
                style={{
                  background: mode === m ? "var(--color-text)" : "transparent",
                  color: mode === m ? "var(--color-surface)" : "var(--color-muted)",
                }}
              >
                {t(`focus.mode.${m}`)}
              </button>
            ))}
          </div>
          <input type="hidden" name="mode" value={mode} />
        </Field>

        {mode === "countdown" ? (
          <Field label={t("focus.duration.label")}>
            <FocusDurationDial
              value={durationMinutes}
              min={COUNTDOWN_MIN_MINUTES}
              max={COUNTDOWN_MAX_MINUTES}
              onChange={setDurationMinutes}
              ariaLabel={t("focus.duration.label")}
            />
            <input type="hidden" name="durationMinutes" value={durationMinutes} />
          </Field>
        ) : (
          <p className="text-[11px] text-muted">{t("focus.stopwatchHelp")}</p>
        )}

        <Field label={t("focus.breaks.toggle")}>
          <label className="flex items-center gap-2 text-[12.5px]">
            <input
              type="checkbox"
              checked={breaksEnabled}
              onChange={(e) => setBreaksEnabled(e.target.checked)}
              className="accent-text"
            />
            {t("focus.breaks.help")}
          </label>
          <input type="hidden" name="breaksEnabled" value={breaksEnabled ? "on" : ""} />
        </Field>

        {breaksEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("focus.breaks.interval")}>
              <div className="flex items-center gap-2">
                <input
                  name="breakIntervalMinutes"
                  type="number"
                  min={BREAK_INTERVAL_MIN_MINUTES}
                  max={BREAK_INTERVAL_MAX_MINUTES}
                  defaultValue={settings.breakIntervalMinutes}
                  className="w-20 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
                />
                <span className="text-[11px] text-muted">{t("focus.duration.minutes")}</span>
              </div>
            </Field>
            <Field label={t("focus.breaks.duration")}>
              <div className="flex items-center gap-2">
                <input
                  name="breakDurationMinutes"
                  type="number"
                  min={BREAK_DURATION_MIN_MINUTES}
                  max={BREAK_DURATION_MAX_MINUTES}
                  defaultValue={settings.breakDurationMinutes}
                  className="w-20 rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-text"
                />
                <span className="text-[11px] text-muted">{t("focus.duration.minutes")}</span>
              </div>
            </Field>
          </div>
        )}

        {habitOptions.length > 0 && (
          <Field label={t("focus.habit.label")}>
            <Select
              variant="field"
              className="md:w-64"
              value={habitId}
              onValueChange={setHabitId}
              options={habitSelectOptions}
            />
            <input type="hidden" name="habitId" value={submittedHabitId} />
          </Field>
        )}

        {categories.length > 0 && (
          <Field label={t("focus.category.label")}>
            {linkedHabit ? (
              <div className="flex w-full items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-sm md:w-64">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: linkedCategory?.color ?? "var(--color-muted)" }}
                  aria-hidden
                />
                <span className="truncate text-muted">
                  {linkedCategory ? categoryDisplayName(linkedCategory, locale) : t("focus.category.none")}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => {
                  const active = categoryId === c.id;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setCategoryId(c.id)}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium"
                      style={{
                        background: active ? "var(--color-text)" : "transparent",
                        color: active ? "var(--color-surface)" : "var(--color-muted)",
                        borderColor: active ? "var(--color-text)" : "var(--color-border)",
                      }}
                    >
                      <span aria-hidden>{c.icon}</span>
                      {categoryDisplayName(c, locale)}
                    </button>
                  );
                })}
              </div>
            )}
            {linkedHabit && <p className="text-[11px] text-muted">{t("focus.category.fromHabit")}</p>}
            <input type="hidden" name="categoryId" value={effectiveCategoryId} />
          </Field>
        )}
      </div>

      <div className="mt-auto pt-8">
        <StartButton label={t("focus.start")} loadingLabel={t("common.loading")} />
      </div>
    </form>
  );
}

// The screen's only CTA — the one that starts the timer — so it deliberately
// breaks the scale of secondary buttons (Save, Pause/Finish): full-width,
// taller, bigger text and one step larger radius. The accent is still
// monochrome (bg-text/text-surface, no new color); the hierarchy is achieved
// through size, weight and spacing.
function StartButton({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-text py-4 text-[15px] font-semibold text-surface transition-transform active:scale-[0.98] disabled:opacity-60"
    >
      {!pending && <Play size={17} strokeWidth={2.25} fill="currentColor" aria-hidden />}
      {pending ? loadingLabel : label}
    </button>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="text-[10px] tracking-wide text-muted uppercase">{label}</div>
      {children}
    </div>
  );
}

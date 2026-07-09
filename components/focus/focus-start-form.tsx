"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Play } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { startFocusSessionForm, type StartFocusSessionFormState } from "@/lib/actions/focus";
import {
  BREAK_DURATION_MAX_MINUTES,
  BREAK_DURATION_MIN_MINUTES,
  BREAK_INTERVAL_MAX_MINUTES,
  BREAK_INTERVAL_MIN_MINUTES,
  COUNTDOWN_MAX_MINUTES,
  COUNTDOWN_MIN_MINUTES,
} from "@/lib/focus/compute";
import type { FocusSettingsRow } from "@/lib/queries/focus";

type Props = {
  settings: FocusSettingsRow;
  habitOptions: { id: string; name: string }[];
  defaultHabitId?: string;
};

const INITIAL_STATE: StartFocusSessionFormState = {};
const MODES = ["countdown", "stopwatch"] as const;

export function FocusStartForm({ settings, habitOptions, defaultHabitId }: Props) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(startFocusSessionForm, INITIAL_STATE);
  const [mode, setMode] = useState<(typeof MODES)[number]>(settings.defaultMode);
  const [breaksEnabled, setBreaksEnabled] = useState(settings.breaksEnabled);
  const [habitId, setHabitId] = useState(defaultHabitId ?? "");

  const habitSelectOptions = [
    { value: "", label: t("focus.habit.none") },
    ...habitOptions.map((h) => ({ value: h.id, label: h.name })),
  ];

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
            <div className="flex items-center gap-2">
              <input
                name="durationMinutes"
                type="number"
                min={COUNTDOWN_MIN_MINUTES}
                max={COUNTDOWN_MAX_MINUTES}
                defaultValue={settings.defaultDurationMinutes}
                required
                className="w-24 rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-text"
              />
              <span className="text-[11px] text-muted">{t("focus.duration.minutes")}</span>
            </div>
            <p className="text-[11px] text-muted">{t("focus.duration.help", { max: COUNTDOWN_MAX_MINUTES })}</p>
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
            <input type="hidden" name="habitId" value={habitId} />
          </Field>
        )}
      </div>

      <div className="mt-auto pt-8">
        <StartButton label={t("focus.start")} loadingLabel={t("common.loading")} />
      </div>
    </form>
  );
}

// Único CTA de la pantalla — el que arranca el timer — así que rompe la
// escala de botones secundarios (Guardar, Pausar/Terminar) a propósito:
// full-width, más alto, texto más grande y radio un escalón mayor. El
// acento sigue siendo monocromo (bg-text/text-surface, sin color nuevo);
// la jerarquía se logra con tamaño, peso y espacio.
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

"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { nanoid } from "nanoid";
import { Plus, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { GymSessionRow } from "@/lib/queries/gym";
import type { GymExerciseCatalogRow } from "@/lib/queries/gym-exercises";
import { createGymSession, updateGymSession } from "@/lib/actions/gym";
import { gymSessionFormSchema, extractGymSessionFields } from "@/lib/validation/gym";
import { useOfflineFormAction } from "@/lib/offline/form";

type SetDraft = { weight: string; reps: string };
type ExerciseDraft = { exerciseId: string; note: string; sets: SetDraft[] };

function toDrafts(session: GymSessionRow | undefined, defaultExerciseId: string): ExerciseDraft[] {
  if (!session || session.exercises.length === 0) {
    return [{ exerciseId: defaultExerciseId, note: "", sets: [{ weight: "", reps: "" }] }];
  }
  return session.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    note: e.note ?? "",
    sets: e.sets.map((s) => ({ weight: s.weight ?? "", reps: String(s.reps) })),
  }));
}

export function GymSessionForm({
  session,
  today,
  exercises: catalog,
}: {
  session?: GymSessionRow;
  today: string;
  exercises: GymExerciseCatalogRow[];
}) {
  const { t, locale } = useI18n();
  const [id] = useState(() => session?.id ?? nanoid());
  const [date, setDate] = useState(session?.date ?? today);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(() => toDrafts(session, catalog[0]?.id ?? ""));

  const catalogOptions = useMemo(
    () => catalog.map((e) => ({ value: e.id, label: categoryDisplayName(e, locale) })),
    [catalog, locale]
  );

  const action = useOfflineFormAction({
    schema: gymSessionFormSchema,
    extractFields: extractGymSessionFields,
    buildMutation: (id, values) =>
      session ? { type: "updateGymSession", sessionId: session.id, values } : { type: "createGymSession", id, values },
    onlineAction: session
      ? (prevState, formData) => updateGymSession(session.id, prevState, formData)
      : createGymSession,
  });
  const [state, formAction] = useActionState(action, {});

  function updateExercise(i: number, patch: Partial<ExerciseDraft>) {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function updateSet(i: number, j: number, patch: Partial<SetDraft>) {
    setExercises((prev) =>
      prev.map((e, idx) =>
        idx === i ? { ...e, sets: e.sets.map((s, sj) => (sj === j ? { ...s, ...patch } : s)) } : e
      )
    );
  }
  function addExercise() {
    setExercises((prev) => [...prev, { exerciseId: catalog[0]?.id ?? "", note: "", sets: [{ weight: "", reps: "" }] }]);
  }
  function removeExercise(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addSet(i: number) {
    // Prefills the new set's weight from the previous one — the same
    // weight repeated across sets is the common case in how these get
    // written down (e.g. "43+5kg 12r 10r 7r"), so this saves retyping it.
    setExercises((prev) =>
      prev.map((e, idx) => {
        if (idx !== i) return e;
        const last = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, { weight: last?.weight ?? "", reps: "" }] };
      })
    );
  }
  function removeSet(i: number, j: number) {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, sets: e.sets.filter((_, sj) => sj !== j) } : e)));
  }

  const serializedExercises = JSON.stringify(
    exercises.map((e) => ({
      exerciseId: e.exerciseId,
      note: e.note || undefined,
      sets: e.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
    }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="exercises" value={serializedExercises} />

      {state.error && (
        <div role="alert" className="rounded-lg border border-cat-fitness/40 px-3.5 py-2.5 text-[12px] text-cat-fitness">
          {t("gym.formError")}
        </div>
      )}
      {state.queued && (
        <div role="status" className="rounded-lg border border-border px-3.5 py-2.5 text-[12px] text-muted">
          {t("offline.savedOffline")}
        </div>
      )}

      <Field label={t("gym.fieldDate")}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2 text-sm outline-none focus:border-text md:w-fit"
        />
      </Field>

      <div className="flex flex-col gap-3">
        {exercises.map((exercise, i) => (
          <ExerciseCard
            key={i}
            index={i}
            exercise={exercise}
            catalogOptions={catalogOptions}
            canRemove={exercises.length > 1}
            onChange={(patch) => updateExercise(i, patch)}
            onRemove={() => removeExercise(i)}
            onAddSet={() => addSet(i)}
            onUpdateSet={(j, patch) => updateSet(i, j, patch)}
            onRemoveSet={(j) => removeSet(i, j)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addExercise}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2.5 text-[12px] font-medium text-muted"
      >
        <Plus size={14} strokeWidth={2} aria-hidden />
        {t("gym.addExercise")}
      </button>

      <SaveBar label={t("common.save")} loadingLabel={t("common.loading")} />
    </form>
  );
}

function ExerciseCard({
  index,
  exercise,
  catalogOptions,
  canRemove,
  onChange,
  onRemove,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}: {
  index: number;
  exercise: ExerciseDraft;
  catalogOptions: { value: string; label: string }[];
  canRemove: boolean;
  onChange: (patch: Partial<ExerciseDraft>) => void;
  onRemove: () => void;
  onAddSet: () => void;
  onUpdateSet: (j: number, patch: Partial<SetDraft>) => void;
  onRemoveSet: (j: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-border p-3.5">
      <div className="flex items-center gap-2">
        <SearchableSelect
          value={exercise.exerciseId}
          onValueChange={(exerciseId) => onChange({ exerciseId })}
          options={catalogOptions}
          ariaLabel={t("gym.exerciseLabel", { n: index + 1 })}
          searchPlaceholder={t("gym.searchExercise")}
          emptyLabel={t("gym.noExerciseMatch")}
          className="flex-1 font-semibold"
        />
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("gym.removeExercise")}
            className="shrink-0 rounded-full p-2 text-muted"
          >
            <Trash2 size={15} strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5">
        {exercise.sets.map((set, j) => (
          <div key={j} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10.5px] text-muted">{t("gym.setLabel", { n: j + 1 })}</span>
            <input
              value={set.weight}
              onChange={(e) => onUpdateSet(j, { weight: e.target.value })}
              placeholder={t("gym.weightPlaceholder")}
              inputMode="decimal"
              className="w-0 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-[13px] outline-none focus:border-text"
            />
            <input
              value={set.reps}
              onChange={(e) => onUpdateSet(j, { reps: e.target.value })}
              placeholder={t("gym.repsPlaceholder")}
              type="number"
              inputMode="numeric"
              min={1}
              required
              className="w-16 shrink-0 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-[13px] outline-none focus:border-text"
            />
            {exercise.sets.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveSet(j)}
                aria-label={t("gym.removeSet")}
                className="shrink-0 p-1 text-muted"
              >
                <X size={13} strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={onAddSet} className="mt-2 flex items-center gap-1 text-[11.5px] font-medium text-muted">
        <Plus size={12} strokeWidth={2} aria-hidden />
        {t("gym.addSet")}
      </button>

      <input
        value={exercise.note}
        onChange={(e) => onChange({ note: e.target.value })}
        placeholder={t("gym.notePlaceholder")}
        maxLength={200}
        className="mt-2.5 w-full rounded-lg border border-border bg-transparent px-3 py-1.5 text-[12px] outline-none focus:border-text"
      />
    </div>
  );
}

/** Sticky within <main> (the app's only scroll container, see the dashboard
 * layout): Save always sits at the bottom of the visible viewport instead of
 * wherever the last field happens to end, so reaching it never needs an
 * extra scroll no matter how long the form gets. */
function SaveBar({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 -mx-5 -mb-6 border-t border-border bg-bg/90 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+18px)] backdrop-blur-xl md:-mx-10 md:-mb-9 md:px-10">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-text px-4 py-3 text-[13px] font-semibold text-surface disabled:opacity-60 md:w-fit"
      >
        {pending ? loadingLabel : label}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] tracking-wide text-muted uppercase">{label}</div>
      {children}
    </div>
  );
}

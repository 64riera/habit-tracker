"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { GymSessionRow } from "@/lib/queries/gym";
import type { GymExercise } from "@/lib/gym/types";
import type { GymExerciseCatalogRow } from "@/lib/queries/gym-exercises";
import type { GymRoutineRow } from "@/lib/queries/gym-routines";
import { createGymSession, updateGymSession } from "@/lib/actions/gym";
import { gymSessionFormSchema, extractGymSessionFields, type GymSessionDraftValues } from "@/lib/validation/gym";
import { useOfflineFormAction, useGymSessionDraftAutosave } from "@/lib/offline/form";
import { useOffline } from "@/lib/offline/client";
import { FormAlert, StickySaveBar, Field } from "@/components/ui/form-primitives";

// `key` is local draft bookkeeping only — a stable identity for React
// across add/remove, never sent to the server (see serializedExercises,
// which picks fields explicitly). Without it, keying by array index made
// React reuse a SearchableSelect/input instance across a different
// exercise or set after removing one from the middle, dragging its
// internal state (open/search text) along with it.
type SetDraft = { key: string; weight: string; reps: string };
type ExerciseDraft = { key: string; exerciseId: string; note: string; sets: SetDraft[] };

/** A pending, not-yet-confirmed draft to restore into the form on mount —
 * either a brand-new session that was autosaved but never submitted, or an
 * in-progress edit to an existing one (see saveGymSessionDraftCore for how
 * these get built server-side). */
export type GymSessionDraftToRestore = {
  id: string;
  date: string;
  exercises: GymExercise[];
  cardioMinutes: number | null;
};

function toDrafts(exercises: GymExercise[] | undefined, defaultExerciseId: string): ExerciseDraft[] {
  if (!exercises || exercises.length === 0) {
    return [{ key: nanoid(), exerciseId: defaultExerciseId, note: "", sets: [{ key: nanoid(), weight: "", reps: "" }] }];
  }
  return exercises.map((e) => ({
    key: nanoid(),
    exerciseId: e.exerciseId,
    note: e.note ?? "",
    sets: e.sets.map((s) => ({ key: nanoid(), weight: s.weight ?? "", reps: String(s.reps) })),
  }));
}

export function GymSessionForm({
  session,
  today,
  exercises: catalog,
  routines = [],
  initialDraft,
}: {
  session?: GymSessionRow;
  today: string;
  exercises: GymExerciseCatalogRow[];
  routines?: GymRoutineRow[];
  initialDraft?: GymSessionDraftToRestore;
}) {
  const { t, locale } = useI18n();
  const { runOrQueue } = useOffline();
  const [id] = useState(() => session?.id ?? initialDraft?.id ?? nanoid());
  const [date, setDate] = useState(initialDraft?.date ?? session?.date ?? today);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(() =>
    toDrafts(initialDraft?.exercises ?? session?.exercises, catalog[0]?.id ?? "")
  );
  const [cardioMinutes, setCardioMinutes] = useState(() =>
    initialDraft ? (initialDraft.cardioMinutes ?? "").toString() : (session?.cardioMinutes ?? "").toString()
  );
  const [draftDismissed, setDraftDismissed] = useState(false);
  const showDraftBanner = Boolean(initialDraft) && !draftDismissed;

  function discardDraft() {
    setDraftDismissed(true);
    setDate(session?.date ?? today);
    setExercises(toDrafts(session?.exercises, catalog[0]?.id ?? ""));
    setCardioMinutes((session?.cardioMinutes ?? "").toString());
    void runOrQueue({ type: "discardGymSessionDraft", id });
  }

  const catalogOptions = useMemo(
    () => catalog.map((e) => ({ value: e.id, label: categoryDisplayName(e, locale) })),
    [catalog, locale]
  );

  // Only offered when logging a brand new session — editing an existing
  // one already has real exercises/sets, so replacing them from a template
  // would just be a confusing way to lose data already typed in.
  function startFromRoutine(routine: GymRoutineRow) {
    setExercises(
      routine.exercises.map((e) => ({
        key: nanoid(),
        exerciseId: e.exerciseId,
        note: e.note ?? "",
        sets: [{ key: nanoid(), weight: "", reps: "" }],
      }))
    );
  }

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
    setExercises((prev) => [
      ...prev,
      { key: nanoid(), exerciseId: catalog[0]?.id ?? "", note: "", sets: [{ key: nanoid(), weight: "", reps: "" }] },
    ]);
  }
  function removeExercise(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addSet(i: number) {
    // Prefills the new set's weight and reps from the previous one — sets
    // usually repeat the same numbers with at most a small correction (e.g.
    // "43+5kg 12r 10r 7r"), so starting from the last set's values and
    // letting ExerciseCard focus straight into the reps field (see there)
    // saves retyping both from scratch every time.
    setExercises((prev) =>
      prev.map((e, idx) => {
        if (idx !== i) return e;
        const last = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, { key: nanoid(), weight: last?.weight ?? "", reps: last?.reps ?? "" }] };
      })
    );
  }
  function removeSet(i: number, j: number) {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, sets: e.sets.filter((_, sj) => sj !== j) } : e)));
  }

  const draftValues: GymSessionDraftValues = useMemo(
    () => ({
      date,
      exercises: exercises.map((e) => ({
        exerciseId: e.exerciseId,
        note: e.note || undefined,
        sets: e.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
      })),
      cardioMinutes: cardioMinutes || undefined,
    }),
    [date, exercises, cardioMinutes]
  );
  const serializedExercises = JSON.stringify(draftValues.exercises);
  const serializedDraftValues = JSON.stringify(draftValues);
  // Baseline to diff against for "has the user actually changed anything
  // since the form opened" — a freshly restored draft starts out equal to
  // this (nothing to autosave yet), only diverging once it's edited
  // further. A lazy useState initializer (not a ref) captures it once at
  // mount without ever calling its setter again.
  const [initialSerializedDraft] = useState(() => serializedDraftValues);
  // Stops autosaving once the real "Guardar" has been queued offline (the
  // component stays mounted showing the "saved offline" banner instead of
  // redirecting) — otherwise a stray autosave tick right after would stash
  // the same, already-confirmed data as a phantom pending draft.
  const dirty = !state.queued && serializedDraftValues !== initialSerializedDraft;
  const autosaveStatus = useGymSessionDraftAutosave({
    id,
    dirty,
    values: draftValues,
    serializedValues: serializedDraftValues,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="exercises" value={serializedExercises} />
      <input type="hidden" name="cardioMinutes" value={cardioMinutes} />
      {session && <input type="hidden" name="expectedUpdatedAt" value={session.updatedAt} />}

      <FormAlert
        error={state.error ? (state.error === "conflict" ? t("gym.conflictError") : t("gym.formError")) : undefined}
        queued={state.queued}
      />

      {showDraftBanner && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5 text-[12px] text-muted"
        >
          <span>{t("gym.draftRestoredBanner")}</span>
          <button type="button" onClick={discardDraft} className="shrink-0 font-semibold text-text">
            {t("gym.discardDraft")}
          </button>
        </div>
      )}

      <Field label={t("gym.fieldDate")} htmlFor="gym-date">
        <input
          id="gym-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-transparent px-3.5 py-2 text-sm outline-none focus:border-text md:w-fit"
        />
      </Field>

      {!session && routines.length > 0 && (
        <Field label={t("gym.startFromRoutine")}>
          <div role="group" aria-label={t("gym.startFromRoutine")} className="flex flex-wrap gap-1.5">
            {routines.map((routine) => (
              <button
                type="button"
                key={routine.id}
                onClick={() => startFromRoutine(routine)}
                className="rounded-full border border-dashed border-border px-3 py-1.5 text-[11.5px] font-medium text-muted"
              >
                {routine.name}
              </button>
            ))}
          </div>
        </Field>
      )}

      <div className="flex flex-col gap-3">
        {exercises.map((exercise, i) => (
          <ExerciseCard
            key={exercise.key}
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

      <Field label={t("gym.cardioMinutes")} htmlFor="gym-cardio-minutes">
        <input
          id="gym-cardio-minutes"
          value={cardioMinutes}
          onChange={(e) => setCardioMinutes(e.target.value)}
          placeholder={t("gym.cardioMinutesPlaceholder")}
          type="number"
          inputMode="numeric"
          min={0}
          max={600}
          className="w-24 rounded-lg border border-border bg-transparent px-3.5 py-2 text-sm outline-none focus:border-text"
        />
      </Field>

      {autosaveStatus !== "idle" && (
        <p role="status" className="text-center text-[10.5px] text-muted">
          {autosaveStatus === "saving" ? t("gym.draftSaving") : t("gym.draftSaved")}
        </p>
      )}

      <StickySaveBar label={t("common.save")} loadingLabel={t("common.loading")} />
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
  const prevSetsLengthRef = useRef(exercise.sets.length);
  const newestRepsInputRef = useRef<HTMLInputElement>(null);

  // Moves focus straight into the new set's reps field whenever one gets
  // added (never on mount or on removal — length only grows on add), so
  // the phone's keyboard has a field to attach to right away instead of
  // going idle. Paired with the "add set" button's onMouseDown below,
  // which stops it from ever taking focus itself: without that, focus
  // would first drop to the button (closing the keyboard) and only then
  // jump here, showing a close/reopen flicker instead of an uninterrupted
  // keyboard.
  useEffect(() => {
    if (exercise.sets.length > prevSetsLengthRef.current) {
      newestRepsInputRef.current?.focus();
      newestRepsInputRef.current?.select();
    }
    prevSetsLengthRef.current = exercise.sets.length;
  }, [exercise.sets.length]);

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
          <div key={set.key} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10.5px] text-muted">{t("gym.setLabel", { n: j + 1 })}</span>
            <input
              value={set.weight}
              onChange={(e) => onUpdateSet(j, { weight: e.target.value })}
              placeholder={t("gym.weightPlaceholder")}
              aria-label={t("gym.weightPlaceholder")}
              inputMode="decimal"
              className="w-0 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-[13px] outline-none focus:border-text"
            />
            <input
              ref={j === exercise.sets.length - 1 ? newestRepsInputRef : undefined}
              value={set.reps}
              onChange={(e) => onUpdateSet(j, { reps: e.target.value })}
              placeholder={t("gym.repsPlaceholder")}
              aria-label={t("gym.repsPlaceholder")}
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

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onAddSet}
        className="mt-2 flex items-center gap-1 text-[11.5px] font-medium text-muted"
      >
        <Plus size={12} strokeWidth={2} aria-hidden />
        {t("gym.addSet")}
      </button>

      <input
        value={exercise.note}
        onChange={(e) => onChange({ note: e.target.value })}
        placeholder={t("gym.notePlaceholder")}
        aria-label={t("gym.notePlaceholder")}
        maxLength={200}
        className="mt-2.5 w-full rounded-lg border border-border bg-transparent px-3 py-1.5 text-[12px] outline-none focus:border-text"
      />
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Plus, RotateCcw, Trash2, X, Check } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName } from "@/lib/habits/describe";
import { cn } from "@/lib/utils";
import { CANONICAL_GYM_ROUTINES } from "@/lib/gym/canonical-routines";
import {
  createGymRoutine,
  updateGymRoutine,
  setGymRoutineHidden,
  resetGymRoutineToCanonical,
} from "@/lib/actions/gym-routines";
import type { GymExerciseCatalogRow } from "@/lib/queries/gym-exercises";
import type { GymRoutineRow } from "@/lib/queries/gym-routines";
import type { RoutineExercise } from "@/lib/gym/types";

const CANONICAL_ROUTINE_NAMES = new Set(CANONICAL_GYM_ROUTINES.map((r) => r.name));

type ExerciseDraft = { exerciseId: string; note: string };

/** Unlike the gym exercise catalog (see gym-exercises-client.tsx), a
 * routine has nothing else referencing it — it's just a template — so
 * there's no reason to offer hide-only "removal" here. Hide still exists
 * (for routines you're not currently running but don't want to retype
 * later), it's just not the only option. */
export function GymRoutinesClient({
  exercises,
  routines,
}: {
  exercises: GymExerciseCatalogRow[];
  routines: GymRoutineRow[];
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState(routines);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();

  const sorted = useMemo(() => [...rows].sort((a, b) => a.sortOrder - b.sortOrder), [rows]);

  function handleToggleHidden(routine: GymRoutineRow) {
    const hidden = !routine.hidden;
    setRows((prev) => prev.map((r) => (r.id === routine.id ? { ...r, hidden } : r)));
    startTransition(async () => {
      await setGymRoutineHidden(routine.id, hidden);
    });
  }

  function handleCreate(name: string, draftExercises: ExerciseDraft[]) {
    const exercisesPayload: RoutineExercise[] = draftExercises.map((e) => ({
      exerciseId: e.exerciseId,
      note: e.note || undefined,
    }));
    const optimisticId = `tmp-${Date.now()}`;
    const maxSortOrder = rows.reduce((max, r) => Math.max(max, r.sortOrder), -1);
    setRows((prev) => [
      ...prev,
      { id: optimisticId, userId: "", name, exercises: exercisesPayload, sortOrder: maxSortOrder + 1, hidden: false },
    ]);
    setCreating(false);
    startTransition(async () => {
      const result = await createGymRoutine(name, exercisesPayload);
      if (result.error) setRows((prev) => prev.filter((r) => r.id !== optimisticId));
    });
  }

  function handleReset(routine: GymRoutineRow) {
    const canonical = CANONICAL_GYM_ROUTINES.find((r) => r.name === routine.name);
    if (!canonical || !confirm(t("gym.confirmResetRoutine"))) return;

    const byName = new Map(exercises.map((e) => [e.nameEs, e.id]));
    const resolved: RoutineExercise[] = canonical.exercises.flatMap((e) => {
      const exerciseId = byName.get(e.nameEs);
      return exerciseId ? [{ exerciseId, note: e.note }] : [];
    });
    if (resolved.length === 0) return;

    setRows((prev) => prev.map((r) => (r.id === routine.id ? { ...r, exercises: resolved } : r)));
    startTransition(async () => {
      await resetGymRoutineToCanonical(routine.id);
    });
  }

  function handleSaveEdit(id: string, name: string, draftExercises: ExerciseDraft[]) {
    const exercisesPayload: RoutineExercise[] = draftExercises.map((e) => ({
      exerciseId: e.exerciseId,
      note: e.note || undefined,
    }));
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name, exercises: exercisesPayload } : r)));
    setEditingId(null);
    startTransition(async () => {
      await updateGymRoutine(id, name, exercisesPayload);
    });
  }

  return (
    <div>
      <ContentHeader titleKey="gym.routinesManage" subtitleKey="gym.routinesManageSubtitle" backHref="/gym" />

      {creating ? (
        <RoutineEditor exercises={exercises} onSave={handleCreate} onCancel={() => setCreating(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2.5 text-[12px] font-medium text-muted"
        >
          <Plus size={14} strokeWidth={2} aria-hidden />
          {t("gym.addNewRoutine")}
        </button>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {sorted.map((routine) =>
          editingId === routine.id ? (
            <RoutineEditor
              key={routine.id}
              exercises={exercises}
              initialName={routine.name}
              initialExercises={routine.exercises.map((e) => ({ exerciseId: e.exerciseId, note: e.note ?? "" }))}
              onSave={(name, draft) => handleSaveEdit(routine.id, name, draft)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={routine.id} className="rounded-lg border border-border p-3.5">
              <div className="flex items-center gap-2">
                <span className={cn("flex-1 truncate text-[13px] font-semibold", routine.hidden && "text-muted line-through")}>
                  {routine.name}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingId(routine.id)}
                  aria-label={t("common.edit")}
                  className="-m-2 shrink-0 rounded-full p-2 text-muted"
                >
                  <Pencil size={15} strokeWidth={2} aria-hidden />
                </button>
                {CANONICAL_ROUTINE_NAMES.has(routine.name) && (
                  <button
                    type="button"
                    onClick={() => handleReset(routine)}
                    aria-label={t("gym.resetRoutine")}
                    title={t("gym.resetRoutine")}
                    className="-m-2 shrink-0 rounded-full p-2 text-muted"
                  >
                    <RotateCcw size={15} strokeWidth={2} aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleToggleHidden(routine)}
                  aria-label={routine.hidden ? t("categories.show") : t("categories.hide")}
                  title={routine.hidden ? t("categories.show") : t("categories.hide")}
                  className="-m-2 shrink-0 rounded-full p-2 text-muted"
                >
                  {routine.hidden ? <EyeOff size={15} strokeWidth={2} aria-hidden /> : <Eye size={15} strokeWidth={2} aria-hidden />}
                </button>
              </div>
              <p className="mt-1.5 truncate text-[11.5px] text-muted">
                {routine.exercises
                  .map((e) => exercises.find((x) => x.id === e.exerciseId))
                  .filter((e): e is GymExerciseCatalogRow => Boolean(e))
                  .map((e) => categoryDisplayName(e, "es"))
                  .join(" · ")}
              </p>
            </div>
          )
        )}
        {sorted.length === 0 && <p className="py-2 text-sm text-muted">{t("gym.routinesEmpty")}</p>}
      </div>
    </div>
  );
}

function RoutineEditor({
  exercises,
  initialName = "",
  initialExercises,
  onSave,
  onCancel,
}: {
  exercises: GymExerciseCatalogRow[];
  initialName?: string;
  initialExercises?: ExerciseDraft[];
  onSave: (name: string, exercises: ExerciseDraft[]) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const [name, setName] = useState(initialName);
  const [draftExercises, setDraftExercises] = useState<ExerciseDraft[]>(
    initialExercises && initialExercises.length > 0
      ? initialExercises
      : [{ exerciseId: exercises[0]?.id ?? "", note: "" }]
  );

  const catalogOptions = useMemo(
    () => exercises.map((e) => ({ value: e.id, label: categoryDisplayName(e, locale) })),
    [exercises, locale]
  );

  function updateExercise(i: number, patch: Partial<ExerciseDraft>) {
    setDraftExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function addExercise() {
    setDraftExercises((prev) => [...prev, { exerciseId: exercises[0]?.id ?? "", note: "" }]);
  }
  function removeExercise(i: number) {
    setDraftExercises((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || draftExercises.length === 0) return;
    onSave(trimmed, draftExercises);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-3.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("gym.routineNamePlaceholder")}
        className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[13px] font-semibold outline-none focus:border-text"
      />

      <div className="flex flex-col gap-2">
        {draftExercises.map((exercise, i) => (
          <div key={i} className="flex items-center gap-2">
            <SearchableSelect
              value={exercise.exerciseId}
              onValueChange={(exerciseId) => updateExercise(i, { exerciseId })}
              options={catalogOptions}
              ariaLabel={t("gym.exerciseLabel", { n: i + 1 })}
              searchPlaceholder={t("gym.searchExercise")}
              emptyLabel={t("gym.noExerciseMatch")}
              className="flex-1"
            />
            <input
              value={exercise.note}
              onChange={(e) => updateExercise(i, { note: e.target.value })}
              placeholder={t("gym.routineTargetPlaceholder")}
              maxLength={40}
              className="w-20 shrink-0 rounded-lg border border-border bg-transparent px-2 py-2.5 text-[12px] outline-none focus:border-text"
            />
            {draftExercises.length > 1 && (
              <button
                type="button"
                onClick={() => removeExercise(i)}
                aria-label={t("gym.removeExercise")}
                className="shrink-0 rounded-full p-2 text-muted"
              >
                <Trash2 size={14} strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addExercise}
        className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted"
      >
        <Plus size={13} strokeWidth={2} aria-hidden />
        {t("gym.addExercise")}
      </button>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-lg bg-text px-3.5 py-2 text-[12.5px] font-semibold text-surface"
        >
          <Check size={14} strokeWidth={2.2} aria-hidden />
          {t("common.save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[12.5px] text-muted"
        >
          <X size={14} strokeWidth={2} aria-hidden />
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}

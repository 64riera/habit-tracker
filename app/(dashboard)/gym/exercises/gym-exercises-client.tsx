"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Plus, X, Check } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/gym/canonical-exercises";
import { createGymExercise, updateGymExercise, setGymExerciseHidden } from "@/lib/actions/gym-exercises";
import type { GymExerciseCatalogRow } from "@/lib/queries/gym-exercises";

function useMuscleGroupOptions() {
  const { t } = useI18n();
  return MUSCLE_GROUPS.map((g) => ({ value: g, label: t(`gym.muscleGroups.${g}`) }));
}

/** Unlike habit/finance categories (a fixed set, hide-only — see
 * categories-client.tsx), the gym exercise catalog can be extended and
 * edited freely: add new movements, rename or reassign the muscle group of
 * any existing one (canonical or custom), and hide ones no longer used.
 * There's no hard delete — same reasoning as categories: a past session may
 * still reference this exercise by id, so hiding is the only safe
 * "removal" (see setGymExerciseHidden in lib/actions/gym-exercises.ts). */
export function GymExercisesClient({ exercises }: { exercises: GymExerciseCatalogRow[] }) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState(exercises);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const muscleGroupOptions = useMuscleGroupOptions();

  const sorted = useMemo(() => [...rows].sort((a, b) => a.sortOrder - b.sortOrder), [rows]);

  function handleToggleHidden(exercise: GymExerciseCatalogRow) {
    const hidden = !exercise.hidden;
    setRows((prev) => prev.map((e) => (e.id === exercise.id ? { ...e, hidden } : e)));
    startTransition(async () => {
      await setGymExerciseHidden(exercise.id, hidden);
    });
  }

  function handleCreate(name: string, muscleGroup: MuscleGroup) {
    const optimisticId = `tmp-${Date.now()}`;
    const maxSortOrder = rows.reduce((max, e) => Math.max(max, e.sortOrder), -1);
    setRows((prev) => [
      ...prev,
      {
        id: optimisticId,
        userId: "",
        nameEs: name,
        nameEn: name,
        muscleGroup,
        sortOrder: maxSortOrder + 1,
        hidden: false,
        isCustom: true,
      },
    ]);
    startTransition(async () => {
      const result = await createGymExercise(name, muscleGroup);
      // Reconciles the optimistic row's placeholder id with the real one
      // (and drops it entirely on failure) the next time the server
      // re-renders this page — revalidatePath in the action already
      // covers that; nothing else to do here on success.
      if (result.error) setRows((prev) => prev.filter((e) => e.id !== optimisticId));
    });
  }

  function handleSaveEdit(id: string, name: string, muscleGroup: MuscleGroup) {
    setRows((prev) => prev.map((e) => (e.id === id ? { ...e, nameEs: name, nameEn: name, muscleGroup, isCustom: true } : e)));
    setEditingId(null);
    startTransition(async () => {
      await updateGymExercise(id, name, muscleGroup);
    });
  }

  return (
    <div>
      <ContentHeader titleKey="gym.exercisesManage" subtitleKey="gym.exercisesManageSubtitle" backHref="/gym" />

      <NewExerciseForm muscleGroupOptions={muscleGroupOptions} onCreate={handleCreate} />

      <div className="mt-4 flex flex-col gap-0.5">
        {sorted.map((exercise) =>
          editingId === exercise.id ? (
            <EditExerciseRow
              key={exercise.id}
              exercise={exercise}
              muscleGroupOptions={muscleGroupOptions}
              onSave={(name, muscleGroup) => handleSaveEdit(exercise.id, name, muscleGroup)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={exercise.id} className="flex items-center gap-2 border-b border-border py-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("truncate text-[13px] font-medium", exercise.hidden && "text-muted line-through")}>
                  {locale === "es" ? exercise.nameEs : exercise.nameEn}
                </span>
                <span className="text-[10.5px] text-muted">{t(`gym.muscleGroups.${exercise.muscleGroup}`)}</span>
              </span>
              <button
                type="button"
                onClick={() => setEditingId(exercise.id)}
                aria-label={t("common.edit")}
                className="-m-2 shrink-0 rounded-full p-2 text-muted"
              >
                <Pencil size={15} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => handleToggleHidden(exercise)}
                aria-label={exercise.hidden ? t("categories.show") : t("categories.hide")}
                title={exercise.hidden ? t("categories.show") : t("categories.hide")}
                className="-m-2 shrink-0 rounded-full p-2 text-muted"
              >
                {exercise.hidden ? <EyeOff size={15} strokeWidth={2} aria-hidden /> : <Eye size={15} strokeWidth={2} aria-hidden />}
              </button>
            </div>
          )
        )}
        {sorted.length === 0 && <p className="py-2 text-sm text-muted">{t("gym.exercisesEmpty")}</p>}
      </div>
    </div>
  );
}

function NewExerciseForm({
  muscleGroupOptions,
  onCreate,
}: {
  muscleGroupOptions: { value: MuscleGroup; label: string }[];
  onCreate: (name: string, muscleGroup: MuscleGroup) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(muscleGroupOptions[0]?.value ?? "chest");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, muscleGroup);
    setName("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("gym.exerciseNamePlaceholder")}
        className="w-0 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-[13px] outline-none focus:border-text"
      />
      <Select
        value={muscleGroup}
        onValueChange={(v) => setMuscleGroup(v as MuscleGroup)}
        options={muscleGroupOptions}
        ariaLabel={t("gym.muscleGroupLabel")}
        className="w-auto shrink-0"
      />
      <button
        type="submit"
        aria-label={t("gym.addNewExercise")}
        className="flex shrink-0 items-center justify-center rounded-full bg-text p-2 text-surface"
      >
        <Plus size={15} strokeWidth={2.2} aria-hidden />
      </button>
    </form>
  );
}

function EditExerciseRow({
  exercise,
  muscleGroupOptions,
  onSave,
  onCancel,
}: {
  exercise: GymExerciseCatalogRow;
  muscleGroupOptions: { value: MuscleGroup; label: string }[];
  onSave: (name: string, muscleGroup: MuscleGroup) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const [name, setName] = useState(locale === "es" ? exercise.nameEs : exercise.nameEn);
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(exercise.muscleGroup as MuscleGroup);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, muscleGroup);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-b border-border py-2.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-0 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 py-1.5 text-[13px] outline-none focus:border-text"
      />
      <Select
        value={muscleGroup}
        onValueChange={(v) => setMuscleGroup(v as MuscleGroup)}
        options={muscleGroupOptions}
        ariaLabel={t("gym.muscleGroupLabel")}
        className="w-auto shrink-0"
      />
      <button type="submit" aria-label={t("common.save")} className="shrink-0 rounded-full p-2 text-muted">
        <Check size={15} strokeWidth={2.2} aria-hidden />
      </button>
      <button type="button" onClick={onCancel} aria-label={t("common.cancel")} className="shrink-0 rounded-full p-2 text-muted">
        <X size={15} strokeWidth={2} aria-hidden />
      </button>
    </form>
  );
}

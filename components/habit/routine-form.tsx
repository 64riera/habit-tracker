"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { nanoid } from "nanoid";
import { useI18n } from "@/lib/i18n/client";
import type { RoutineWithHabits } from "@/lib/queries/routines";
import { createRoutine, updateRoutine } from "@/lib/actions/routines";
import { routineSchema, extractRoutineFields } from "@/lib/validation/routine";
import { useOfflineFormAction } from "@/lib/offline/form";
import { FormAlert, Field } from "@/components/ui/form-primitives";

export function RoutineForm({
  habits,
  routine,
}: {
  habits: { id: string; name: string }[];
  routine?: RoutineWithHabits;
}) {
  const { t } = useI18n();
  const selectedIds = new Set(routine?.habitIds ?? []);
  const [id] = useState(() => routine?.id ?? nanoid());
  const action = useOfflineFormAction({
    schema: routineSchema,
    extractFields: extractRoutineFields,
    buildMutation: (id, values) =>
      routine
        ? { type: "updateRoutine", routineId: routine.id, values }
        : { type: "createRoutine", id, values },
    onlineAction: routine
      ? (prevState, formData) => updateRoutine(routine.id, prevState, formData)
      : createRoutine,
  });
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="id" value={id} />

      <FormAlert error={state.error ? t("routines.formError") : undefined} queued={state.queued} />

      <Field label={t("routines.fieldName")} htmlFor="routine-name">
        <input
          id="routine-name"
          name="name"
          required
          maxLength={60}
          defaultValue={routine?.name ?? ""}
          className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-text"
        />
      </Field>
      <Field label={t("routines.fieldHabits")}>
        <div className="flex flex-col gap-1.5">
          {habits.map((h) => (
            <label key={h.id} className="flex items-center gap-2.5 text-[13px]">
              <input type="checkbox" name="habitIds" value={h.id} defaultChecked={selectedIds.has(h.id)} />
              {h.name}
            </label>
          ))}
          {habits.length === 0 && <p className="text-xs text-muted">{t("habit.empty")}</p>}
        </div>
      </Field>
      <SaveButton label={t("common.save")} loadingLabel={t("common.loading")} />
    </form>
  );
}

function SaveButton({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-lg bg-text px-4 py-2 text-[12.5px] font-semibold text-surface disabled:opacity-60"
    >
      {pending ? loadingLabel : label}
    </button>
  );
}

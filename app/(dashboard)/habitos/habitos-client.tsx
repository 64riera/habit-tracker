"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContentHeader } from "@/components/nav/content-header";
import { ReorderableList } from "@/components/ui/reorderable-list";
import { useI18n } from "@/lib/i18n/client";
import { categoryDisplayName, describeFrequency } from "@/lib/habits/describe";
import { reorderHabits, restoreHabit, togglePinHabit } from "@/lib/actions/habits";
import type { HabitWithExtras } from "@/lib/queries/habits";

export function HabitosClient({ habits }: { habits: HabitWithExtras[] }) {
  const { t, dict, locale } = useI18n();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pinnedOverrides, setPinnedOverrides] = useState<Record<string, boolean>>({});
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());

  const visibleHabits = habits.filter((h) => h.status !== "archived");
  const archivedHabits = habits.filter((h) => h.status === "archived" && !restoredIds.has(h.id));

  function handleReorder(orderedIds: string[]) {
    startTransition(async () => {
      await reorderHabits(orderedIds);
      router.refresh();
    });
  }

  function handleTogglePin(habitId: string, pinned: boolean) {
    setPinnedOverrides((prev) => ({ ...prev, [habitId]: pinned }));
    startTransition(async () => {
      await togglePinHabit(habitId, pinned);
      router.refresh();
    });
  }

  function handleRestore(habitId: string) {
    setRestoredIds((prev) => new Set(prev).add(habitId));
    startTransition(async () => {
      await restoreHabit(habitId);
      router.refresh();
    });
  }

  return (
    <div>
      <ContentHeader titleKey="screens.habitos.title" subtitleKey="screens.habitos.subtitle" />

      {visibleHabits.length === 0 ? (
        <p className="text-sm text-muted">{t("habit.empty")}</p>
      ) : (
        <ReorderableList
          items={visibleHabits}
          onReorder={handleReorder}
          renderItem={(habit, dragHandleProps) => {
            const color = habit.category?.color ?? "var(--color-text)";
            const isPinned = pinnedOverrides[habit.id] ?? habit.isPinned;
            return (
              <div className="flex items-center gap-2.5 border-b border-border py-3">
                <button
                  type="button"
                  onPointerDown={dragHandleProps.onPointerDown}
                  onKeyDown={dragHandleProps.onKeyDown}
                  className="shrink-0 cursor-grab select-none px-0.5 text-muted"
                  style={{ touchAction: "none" }}
                  aria-label={t("habit.reorder")}
                >
                  ⠿
                </button>
                <Link
                  href={`/habitos/${habit.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif-italic text-[13px] font-semibold"
                    style={{ background: `color-mix(in oklch, ${color} 16%, transparent)`, color }}
                  >
                    {habit.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{habit.name}</div>
                    <div className="mt-0.5 truncate text-[10.5px] text-muted">
                      {categoryDisplayName(habit.category, locale)} · {describeFrequency(habit, dict)}
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleTogglePin(habit.id, !isPinned)}
                  aria-label={isPinned ? t("habit.unpin") : t("habit.pin")}
                  className="shrink-0 text-sm"
                  style={{ color: isPinned ? "var(--color-accent)" : "var(--color-border)" }}
                >
                  ★
                </button>
                <div
                  className="shrink-0 text-[9.5px] font-semibold"
                  style={{
                    color:
                      habit.status === "active" ? "var(--color-text)" : "var(--color-muted)",
                  }}
                >
                  {t(`habit.status.${habit.status}`)}
                </div>
              </div>
            );
          }}
        />
      )}

      {archivedHabits.length > 0 && (
        <div className="mt-5">
          <div className="mb-1 text-[10px] tracking-wide text-muted uppercase">
            {t("habit.archivedSection")}
          </div>
          <div className="flex flex-col">
            {archivedHabits.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center gap-2.5 border-b border-border py-3 opacity-60"
              >
                <div className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                  {habit.name}
                </div>
                <button
                  type="button"
                  onClick={() => handleRestore(habit.id)}
                  className="shrink-0 rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted"
                >
                  {t("habit.restore")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <Link
          href="/habitos/nuevo"
          className="rounded-xl border border-dashed border-border py-2.5 text-center text-xs text-muted"
        >
          {t("habit.newHabit")}
        </Link>
        <Link
          href="/habitos/categorias"
          className="rounded-xl border border-dashed border-border py-2.5 text-center text-xs text-muted"
        >
          {t("categories.manage")}
        </Link>
        <Link
          href="/habitos/rutinas"
          className="rounded-xl border border-dashed border-border py-2.5 text-center text-xs text-muted"
        >
          {t("routines.title")}
        </Link>
        <Link
          href="/habitos/logros"
          className="rounded-xl border border-dashed border-border py-2.5 text-center text-xs text-muted"
        >
          {t("achievements.title")}
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";
import { categoryLabel, describeFrequency } from "@/lib/habits/describe";
import type { HabitWithExtras } from "@/lib/queries/habits";

const CAT_COLOR: Record<string, string> = {
  creatividad: "var(--color-cat-creatividad)",
  fitness: "var(--color-cat-fitness)",
  aprendizaje: "var(--color-cat-aprendizaje)",
  estudio: "var(--color-cat-estudio)",
  bienestar: "var(--color-cat-bienestar)",
};

export function HabitosClient({ habits }: { habits: HabitWithExtras[] }) {
  const { t, dict } = useI18n();

  return (
    <div>
      <ContentHeader titleKey="screens.habitos.title" subtitleKey="screens.habitos.subtitle" />

      {habits.length === 0 ? (
        <p className="text-sm text-muted">{t("habit.empty")}</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {habits.map((habit) => {
            const color = habit.categoryId
              ? (CAT_COLOR[habit.categoryId] ?? "var(--color-text)")
              : "var(--color-text)";
            return (
              <Link
                key={habit.id}
                href={`/habitos/${habit.id}`}
                className="flex items-center gap-3 border-b border-border py-3"
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
                    {categoryLabel(habit.categoryId, dict)} · {describeFrequency(habit, dict)}
                  </div>
                </div>
                <div
                  className="shrink-0 text-[9.5px] font-semibold"
                  style={{
                    color:
                      habit.status === "active" ? "var(--color-text)" : "var(--color-muted)",
                  }}
                >
                  {t(`habit.status.${habit.status}`)}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href="/habitos/nuevo"
        className="mt-3.5 block rounded-xl border border-dashed border-border py-2.5 text-center text-xs text-muted"
      >
        {t("habit.newHabit")}
      </Link>
    </div>
  );
}

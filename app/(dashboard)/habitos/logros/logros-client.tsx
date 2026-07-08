"use client";

import { Trophy } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";
import type { HabitAchievements } from "@/lib/queries/achievements";

function formatUnlockedDate(unlockedAt: string, locale: string): string {
  const isoish = unlockedAt.includes("T") ? unlockedAt : unlockedAt.replace(" ", "T") + "Z";
  const date = new Date(isoish);
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function LogrosClient({ habits }: { habits: HabitAchievements[] }) {
  const { t, locale } = useI18n();

  return (
    <div>
      <ContentHeader
        titleKey="achievements.title"
        subtitleKey="achievements.subtitle"
        backHref="/habitos"
      />

      {habits.length === 0 ? (
        <p className="text-sm text-muted">{t("habit.empty")}</p>
      ) : (
        <div className="flex flex-col gap-5">
          {habits.map((h) => (
            <div key={h.habitId}>
              <div className="mb-2 text-[13px] font-semibold">{h.habitName}</div>
              <div className="flex flex-wrap gap-2">
                {h.badges.map((badge) => {
                  const unlocked = !!badge.unlockedAt;
                  return (
                    <div
                      key={badge.type}
                      className={
                        unlocked
                          ? "flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-center"
                          : "flex flex-col items-center gap-1 rounded-xl border border-dashed px-3 py-2.5 text-center opacity-50"
                      }
                      style={{
                        borderColor: unlocked ? "var(--color-accent)" : "var(--color-border)",
                        background: unlocked
                          ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                          : "transparent",
                        minWidth: 100,
                      }}
                    >
                      {unlocked && (
                        <Trophy
                          size={14}
                          strokeWidth={2}
                          color="var(--color-accent)"
                          aria-hidden
                        />
                      )}
                      <span
                        className="text-[11.5px] font-semibold"
                        style={{ color: unlocked ? "var(--color-accent)" : "var(--color-muted)" }}
                      >
                        {t(`achievements.types.${badge.type}`)}
                      </span>
                      <span className="text-[9.5px] text-muted">
                        {unlocked
                          ? t("achievements.unlockedOn", {
                              date: formatUnlockedDate(badge.unlockedAt!, locale),
                            })
                          : t("achievements.locked")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

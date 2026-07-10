"use client";

import { useI18n } from "@/lib/i18n/client";
import { StatusGlyph } from "@/components/habit/status-glyph";
import { StreakProgress } from "@/components/stats/streak-progress";
import { MetricSummaryCard } from "@/components/stats/metric-summary-card";
import { Reveal } from "./reveal";

const DEMO_ROWS: { name: string; color: string; status: string }[] = [
  { name: "Practicar guitarra", color: "var(--cat-creatividad)", status: "done" },
  { name: "Correr 5 km", color: "var(--cat-fitness)", status: "done" },
  { name: "Leer en inglés", color: "var(--cat-aprendizaje)", status: "partial" },
];

function CheckinPreviewCard({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="flex flex-col gap-2.5">
        {DEMO_ROWS.map((row) => (
          <div key={row.name} className="flex items-center gap-2.5">
            <StatusGlyph status={row.status} size={20} />
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: row.color }} />
            <span className="truncate text-[13px]">{row.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureBento() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24">
      <div className="grid gap-4 md:grid-cols-4">
        <Reveal className="rounded-2xl border border-border p-6 md:col-span-2 md:row-span-2" delay={0}>
          <div
            className="flex flex-col gap-6 rounded-xl p-2"
            style={{ background: "color-mix(in srgb, var(--cat-creatividad) 7%, transparent)" }}
          >
            <div>
              <h3 className="text-lg font-semibold">{t("landing.features.checkin.title")}</h3>
              <p className="mt-2 max-w-[38ch] text-[13px] leading-relaxed text-muted">
                {t("landing.features.checkin.body")}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <CheckinPreviewCard title={t("screens.hoy.title")} />
            </div>
          </div>
        </Reveal>

        <Reveal className="rounded-2xl border border-border p-6 md:col-span-2" delay={80}>
          <h3 className="text-lg font-semibold">{t("landing.features.streaks.title")}</h3>
          <p className="mt-2 max-w-[42ch] text-[13px] leading-relaxed text-muted">
            {t("landing.features.streaks.body")}
          </p>
          <div className="mt-4 max-w-[280px]">
            <StreakProgress current={23} longest={31} />
          </div>
        </Reveal>

        <Reveal className="rounded-2xl border border-border p-6" delay={140}>
          <h3 className="text-[15px] font-semibold">{t("landing.features.focus.title")}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{t("landing.features.focus.body")}</p>
          <div className="mt-4">
            <MetricSummaryCard title={t("screens.enfoque.title")} value="32 min" secondaryStats={[{ label: t("focus.stats.sessions"), value: "3" }]} />
          </div>
        </Reveal>

        <Reveal className="rounded-2xl border border-border p-6" delay={200}>
          <h3 className="text-[15px] font-semibold">{t("landing.features.stats.title")}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{t("landing.features.stats.body")}</p>
          <div className="mt-4">
            <MetricSummaryCard
              title={t("stats.weeklySummary")}
              value="86%"
              delta={{ text: "+12%", positive: true }}
              secondaryStats={[{ label: t("stats.bestStreakLabel"), value: "31" }]}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

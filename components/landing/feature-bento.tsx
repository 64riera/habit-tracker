"use client";

import { useI18n } from "@/lib/i18n/client";
import { StatusGlyph } from "@/components/habit/status-glyph";
import { StreakProgress } from "@/components/stats/streak-progress";
import { MetricSummaryCard } from "@/components/stats/metric-summary-card";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

/** Entrance (Reveal, on its own element) is kept separate from the hover
 * lift (on this inner element): stacking both transforms on one node would
 * make hover inherit the entrance's transition-delay, so a quick hover
 * right after scrolling in would feel sluggish. */
function BentoCard({
  delay,
  gridClassName,
  children,
}: {
  delay: number;
  gridClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal variant="scale" delay={delay} className={gridClassName}>
      <div
        className={cn(
          "h-full rounded-2xl border border-border p-6 transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "hover:-translate-y-1 hover:shadow-[0_16px_32px_-20px_var(--header-shadow)]",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        )}
      >
        {children}
      </div>
    </Reveal>
  );
}

const DEMO_ROWS: { name: string; color: string; status: string }[] = [
  { name: "Beber 8 vasos de agua", color: "var(--cat-bienestar)", status: "done" },
  { name: "Leer 15 páginas de un libro", color: "var(--cat-aprendizaje)", status: "done" },
  { name: "Estudiar para mi examen final", color: "var(--cat-estudio)", status: "partial" },
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
        <BentoCard delay={0} gridClassName="md:col-span-2 md:row-span-2">
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
        </BentoCard>

        <BentoCard delay={80} gridClassName="md:col-span-2">
          <h3 className="text-lg font-semibold">{t("landing.features.streaks.title")}</h3>
          <p className="mt-2 max-w-[42ch] text-[13px] leading-relaxed text-muted">
            {t("landing.features.streaks.body")}
          </p>
          <div className="mt-4 max-w-[280px]">
            <StreakProgress current={23} longest={31} />
          </div>
        </BentoCard>

        <BentoCard delay={140}>
          <h3 className="text-[15px] font-semibold">{t("landing.features.focus.title")}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{t("landing.features.focus.body")}</p>
          <div className="mt-4">
            <MetricSummaryCard title={t("screens.enfoque.title")} value="32 min" secondaryStats={[{ label: t("focus.stats.sessions"), value: "3" }]} />
          </div>
        </BentoCard>

        <BentoCard delay={200}>
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
        </BentoCard>
      </div>
    </section>
  );
}

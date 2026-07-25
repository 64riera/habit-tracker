"use client";

import { Check, Dumbbell } from "lucide-react";
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

/** Income vs. expense as two bars, not another metric card — Focus and
 * Stats already use MetricSummaryCard, and finance's own signature is a
 * comparison (money in vs. money out), not a single hero number. Demo
 * amounts only, same as DEMO_ROWS above — never real account data. */
function FinancePreviewCard({ title }: { title: string }) {
  const { t } = useI18n();
  const rows = [
    { label: t("finance.summary.income"), amount: "$32,400", pct: 100, color: "var(--color-income)" },
    { label: t("finance.summary.expense"), amount: "$18,900", pct: 58, color: "var(--color-expense)" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="text-muted">{row.label}</span>
              <span className="font-semibold tabular-nums">{row.amount}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-border">
              <div className="h-1.5 rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Checkbox + cadence pill, deliberately not StatusGlyph + colored dot (the
 * check-in card's language) — a task's defining trait is that it comes back
 * on a schedule, not that it belongs to a category, so the cadence is what
 * gets a visual slot here. */
function TasksPreviewCard({ title }: { title: string }) {
  const { t, locale } = useI18n();
  const rows = [
    { label: locale === "en" ? "Pay rent" : "Pagar la renta", cadence: t("tasks.recurrence.monthly"), done: true },
    { label: locale === "en" ? "Water plants" : "Regar plantas", cadence: t("tasks.recurrence.weekly"), done: false },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2.5">
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border"
              style={{
                borderColor: row.done ? "var(--color-accent)" : "var(--color-border)",
                background: row.done ? "var(--color-accent)" : "transparent",
              }}
              aria-hidden
            >
              {row.done && <Check size={11} strokeWidth={3} color="var(--color-accent-contrast)" />}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px]">{row.label}</span>
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
              {row.cadence}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Same icon + summary-line grammar as the real GymSessionRow (see
 * components/gym/gym-session-row.tsx) — this is what the actual list looks
 * like, not a reinvented preview style. Names are the app's own canonical
 * exercise catalog (lib/gym/canonical-exercises.ts), not anyone's real log. */
function GymPreviewCard({ title }: { title: string }) {
  const { t, locale } = useI18n();
  const name = locale === "en" ? "Leg press" : "Prensa de piernas";
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklch, var(--color-cat-fitness) 16%, transparent)", color: "var(--color-cat-fitness)" }}
          aria-hidden
        >
          <Dumbbell size={16} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{name}</div>
          <div className="text-[11px] text-muted">{t("gym.summary", { exercises: 2, sets: 6 })} · 20 min cardio</div>
        </div>
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

        <BentoCard delay={260} gridClassName="md:col-span-2">
          <h3 className="text-lg font-semibold">{t("landing.features.finance.title")}</h3>
          <p className="mt-2 max-w-[42ch] text-[13px] leading-relaxed text-muted">
            {t("landing.features.finance.body")}
          </p>
          <div className="mt-4 rounded-xl border border-border p-4">
            <FinancePreviewCard title={t("nav.finance")} />
          </div>
        </BentoCard>

        <BentoCard delay={320}>
          <h3 className="text-[15px] font-semibold">{t("landing.features.tasks.title")}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{t("landing.features.tasks.body")}</p>
          <div className="mt-4 rounded-xl border border-border p-4">
            <TasksPreviewCard title={t("nav.tareas")} />
          </div>
        </BentoCard>

        <BentoCard delay={380}>
          <h3 className="text-[15px] font-semibold">{t("landing.features.gym.title")}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{t("landing.features.gym.body")}</p>
          <div className="mt-4 rounded-xl border border-border p-4">
            <GymPreviewCard title={t("nav.gym")} />
          </div>
        </BentoCard>
      </div>
    </section>
  );
}

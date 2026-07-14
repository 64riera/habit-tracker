"use client";

import { useTransition } from "react";
import { useSWRConfig } from "swr";
import { useI18n } from "@/lib/i18n/client";
import { Select } from "@/components/ui/select";
import { setFocusDailyGoal } from "@/lib/actions/focus";
import { swrKeys } from "@/lib/swr/keys";

const PRESET_MINUTES = [15, 30, 45, 60, 90, 120, 180, 240];

export function FocusGoalControl({ goalMinutes, today }: { goalMinutes: number; today: string }) {
  const { t } = useI18n();
  const { mutate } = useSWRConfig();
  const [isPending, startTransition] = useTransition();

  const presets = PRESET_MINUTES.includes(goalMinutes)
    ? PRESET_MINUTES
    : [...PRESET_MINUTES, goalMinutes].sort((a, b) => a - b);
  const options = presets.map((m) => ({ value: String(m), label: `${m} ${t("focus.duration.minutes")}` }));

  function onChange(value: string) {
    startTransition(async () => {
      await setFocusDailyGoal(Number(value));
      mutate(swrKeys.focusSupporting(today));
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-muted">{t("focus.goal.label")}</span>
      <Select
        variant="pill"
        value={String(goalMinutes)}
        onValueChange={onChange}
        options={options}
        ariaLabel={t("focus.goal.label")}
        className={isPending ? "pointer-events-none opacity-60" : undefined}
      />
    </div>
  );
}

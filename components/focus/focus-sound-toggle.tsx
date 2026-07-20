"use client";

import { useTransition } from "react";
import { useSWRConfig } from "swr";
import { useI18n } from "@/lib/i18n/client";
import { useToast } from "@/lib/toast/client";
import { setFocusSoundEnabled } from "@/lib/actions/focus";
import { swrKeys } from "@/lib/swr/keys";

export function FocusSoundToggle({ enabled, today }: { enabled: boolean; today: string }) {
  const { t } = useI18n();
  const { mutate } = useSWRConfig();
  const { push } = useToast();
  const [isPending, startTransition] = useTransition();

  function onChange(next: boolean) {
    startTransition(async () => {
      try {
        await setFocusSoundEnabled(next);
        mutate(swrKeys.focusSupporting(today));
      } catch {
        // Same reasoning as FocusGoalControl: the checkbox is controlled by
        // the SWR-backed `enabled` prop, so a failed save already reverts
        // it visually — this toast is the only failure feedback the user gets.
        push(t("common.saveFailed"));
      }
    });
  }

  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-muted">{t("focus.alerts.soundLabel")}</span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        disabled={isPending}
        className="accent-text"
      />
    </label>
  );
}

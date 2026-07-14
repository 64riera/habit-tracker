"use client";

import { useTransition } from "react";
import { useSWRConfig } from "swr";
import { useI18n } from "@/lib/i18n/client";
import { setFocusSoundEnabled } from "@/lib/actions/focus";
import { swrKeys } from "@/lib/swr/keys";

export function FocusSoundToggle({ enabled, today }: { enabled: boolean; today: string }) {
  const { t } = useI18n();
  const { mutate } = useSWRConfig();
  const [isPending, startTransition] = useTransition();

  function onChange(next: boolean) {
    startTransition(async () => {
      await setFocusSoundEnabled(next);
      mutate(swrKeys.focusSupporting(today));
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

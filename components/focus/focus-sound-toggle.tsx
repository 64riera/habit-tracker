"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { setFocusSoundEnabled } from "@/lib/actions/focus";

export function FocusSoundToggle({ enabled }: { enabled: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(next: boolean) {
    startTransition(async () => {
      await setFocusSoundEnabled(next);
      router.refresh();
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

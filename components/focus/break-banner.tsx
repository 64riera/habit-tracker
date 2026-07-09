"use client";

import { Coffee } from "lucide-react";
import { useFormStatus } from "react-dom";
import { useI18n } from "@/lib/i18n/client";
import { formatClock } from "@/lib/focus/format";
import { endBreakEarly } from "@/lib/actions/focus";

export function BreakBanner({ remainingSeconds }: { remainingSeconds: number }) {
  const { t } = useI18n();
  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-8 text-center">
      <Coffee size={22} strokeWidth={1.75} className="text-muted" aria-hidden />
      <div className="font-serif-italic text-[19px]">{t("focus.break.title")}</div>
      <p className="text-[12px] text-muted">{t("focus.break.subtitle")}</p>
      <div className="font-serif-italic text-[30px] font-semibold tabular-nums">{formatClock(remainingSeconds)}</div>
      <form action={endBreakEarly}>
        <EndBreakButton label={t("focus.controls.endBreak")} />
      </form>
    </div>
  );
}

function EndBreakButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-border px-4 py-2 text-[12px] font-medium disabled:opacity-60"
    >
      {label}
    </button>
  );
}

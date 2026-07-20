"use client";

import { useFormStatus } from "react-dom";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Error/offline-queued banner shared by every entity form. `error` is the already-resolved
 * message for the current failure (callers pick the right key, e.g. gym's conflict vs. generic
 * error) — this component only owns the "saved offline" copy, since that one's identical
 * everywhere. `className` covers the couple of forms (habit, focus) that aren't inside a
 * `gap-*` flex container and need their own bottom margin. */
export function FormAlert({ error, queued, className }: { error?: string; queued?: boolean; className?: string }) {
  const { t } = useI18n();
  return (
    <>
      {error && (
        <div
          role="alert"
          className={cn("rounded-lg border border-cat-fitness/40 px-3.5 py-2.5 text-[12px] text-cat-fitness", className)}
        >
          {error}
        </div>
      )}
      {queued && (
        <div role="status" className={cn("rounded-lg border border-border px-3.5 py-2.5 text-[12px] text-muted", className)}>
          {t("offline.savedOffline")}
        </div>
      )}
    </>
  );
}

/** Sticky within <main> (the app's only scroll container, see the dashboard layout): Save
 * always sits at the bottom of the visible viewport instead of wherever the last field happens
 * to end, so reaching it never needs an extra scroll no matter how long the form gets. */
export function StickySaveBar({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 -mx-5 -mb-6 border-t border-border bg-bg/90 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+18px)] backdrop-blur-xl md:-mx-10 md:-mb-9 md:px-10">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-text px-4 py-3 text-[13px] font-semibold text-surface disabled:opacity-60 md:w-fit"
      >
        {pending ? loadingLabel : label}
      </button>
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="text-[10px] tracking-wide text-muted uppercase">{label}</div>
      {children}
    </div>
  );
}

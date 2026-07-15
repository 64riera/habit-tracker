"use client";

/** Text-label pill tabs, controlled by local state (not a route) — the same
 * visual pattern already used inline for the mode selector in
 * focus-start-form.tsx (flex-1 buttons in a bordered row, active =
 * bg-text/text-surface), extracted here since a second place now needs it
 * verbatim. Sibling of SegmentedControl (icon-only, used for theme toggles)
 * and SegmentedRouteTabs (same look, but each tab is a separate route). */
export function PillTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex overflow-hidden rounded-lg border border-border">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className="flex-1 px-1 py-2.5 text-[12px] font-medium transition-colors"
            style={{
              background: active ? "var(--color-text)" : "transparent",
              color: active ? "var(--color-surface)" : "var(--color-muted)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

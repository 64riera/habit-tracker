"use client";

import type { LucideIcon } from "lucide-react";

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  icon: LucideIcon;
};

/** Pill of icon buttons, one active at a time — used for the theme and dark
 * mode style toggles (see theme-toggle.tsx, dark-variant-toggle.tsx). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-[2px] rounded-full bg-border p-[2px]">
      {options.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            aria-label={opt.label}
            title={opt.label}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-full transition-colors md:h-[26px] md:w-[26px]"
            style={{
              background: active ? "var(--color-accent)" : "transparent",
              color: active ? "var(--color-accent-contrast)" : "var(--color-muted)",
            }}
          >
            <Icon size={13} strokeWidth={2.2} />
          </button>
        );
      })}
    </div>
  );
}

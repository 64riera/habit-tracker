"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** `field`: same treatment as a form <input> (full border, fixed width).
   *  `pill`: same treatment as pill filters (fully rounded border, compact). */
  variant?: "field" | "pill";
  ariaLabel?: string;
  className?: string;
};

/**
 * Accessible replacement for the native <select>: same keyboard/focus
 * behavior that the browser already gives for free, but with a dropdown
 * menu that can be styled (the native <select> doesn't allow that) so it
 * matches the rest of the system instead of breaking with the browser's look.
 */
export function Select({ value, onValueChange, options, placeholder, variant = "field", ariaLabel, className }: Props) {
  const selected = options.find((o) => o.value === value);

  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          "flex items-center justify-between gap-1.5 border border-border bg-transparent text-left outline-none data-[placeholder]:text-muted focus:border-text",
          variant === "field" && "w-full rounded-lg px-3.5 py-2.5 text-sm",
          variant === "pill" && "rounded-full px-3 py-1.5 text-[11px] font-medium",
          className
        )}
      >
        <RadixSelect.Value placeholder={placeholder}>{selected?.label ?? placeholder}</RadixSelect.Value>
        <RadixSelect.Icon>
          <ChevronDown size={variant === "pill" ? 12 : 14} strokeWidth={2.2} className="shrink-0 text-muted" aria-hidden />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-20 max-h-[min(20rem,var(--radix-select-content-available-height))] overflow-hidden rounded-lg border border-border bg-surface shadow-[0_18px_28px_-18px_var(--header-shadow)]"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((o) => (
              <RadixSelect.Item
                key={o.value}
                value={o.value}
                className={cn(
                  "relative flex cursor-pointer items-center rounded-md py-1.5 pr-7 pl-2.5 text-[12.5px] outline-none select-none",
                  "data-[highlighted]:bg-bg data-[state=checked]:font-semibold"
                )}
              >
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2 flex items-center">
                  <Check size={13} strokeWidth={2.4} aria-hidden />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

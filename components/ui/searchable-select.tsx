"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = { value: string; label: string };

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  ariaLabel?: string;
  className?: string;
};

/**
 * Like `Select` (components/ui/select.tsx), but with a text filter instead
 * of just scrolling — meant for option lists long enough that scanning them
 * by eye stops being the fastest way to find one (the gym exercise catalog,
 * once a user has added their own on top of the canonical set). Built on
 * Popover instead of extending Radix's own Select: that primitive is a
 * plain listbox with no room for an in-content text input.
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  ariaLabel,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    itemRefs.current[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      setHighlighted(0);
    }
  }

  function selectOption(option: SearchableSelectOption) {
    onValueChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[highlighted];
      if (option) selectOption(option);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        type="button"
        aria-label={ariaLabel}
        className={cn(
          "flex w-full items-center justify-between gap-1.5 rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-left text-sm outline-none focus:border-text",
          className
        )}
      >
        <span className={cn("truncate", !selected && "text-muted")}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={14} strokeWidth={2.2} className="shrink-0 text-muted" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-20 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface shadow-[0_18px_28px_-18px_var(--header-shadow)]"
        >
          <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
            <Search size={13} strokeWidth={2.2} className="shrink-0 text-muted" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlighted(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-muted"
            />
          </div>
          <div className="max-h-[min(16rem,var(--radix-popover-content-available-height))] overflow-y-auto p-1">
            {filtered.map((o, i) => (
              <button
                type="button"
                key={o.value}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onClick={() => selectOption(o)}
                onMouseEnter={() => setHighlighted(i)}
                className={cn(
                  "relative flex w-full cursor-pointer items-center rounded-md py-1.5 pr-7 pl-2.5 text-left text-[12.5px] outline-none select-none",
                  i === highlighted && "bg-bg",
                  o.value === value && "font-semibold"
                )}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check size={13} strokeWidth={2.4} className="absolute right-2" aria-hidden />}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-2.5 py-3 text-center text-[12px] text-muted">{emptyLabel}</p>}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

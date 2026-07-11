"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const VARIANT_HIDDEN = {
  up: "translate-y-4 scale-100 opacity-0",
  scale: "translate-y-0 scale-[0.96] opacity-0",
  pop: "translate-y-2 scale-90 opacity-0",
} as const;

const VARIANT_EASE = {
  up: "cubic-bezier(0.16,1,0.3,1)",
  scale: "cubic-bezier(0.16,1,0.3,1)",
  // Slight overshoot: makes the pills feel tossed/popped into place rather
  // than just faded, appropriate once for the categories row's playful accent.
  pop: "cubic-bezier(0.34,1.56,0.64,1)",
} as const;

/**
 * Fade + transform-in the first time the element enters the viewport.
 * IntersectionObserver instead of a scroll listener (see the design
 * skill's AGENTS: no `window.addEventListener("scroll")`).
 * `prefers-reduced-motion` collapses straight to the final state, no
 * transition.
 */
export function Reveal({
  children,
  delay = 0,
  variant = "up",
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  variant?: keyof typeof VARIANT_HIDDEN;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 motion-reduce:transition-none",
        visible ? "translate-y-0 scale-100 opacity-100" : VARIANT_HIDDEN[variant],
        className
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms", transitionTimingFunction: VARIANT_EASE[variant] }}
    >
      {children}
    </div>
  );
}

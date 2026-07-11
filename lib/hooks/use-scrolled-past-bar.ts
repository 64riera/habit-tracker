"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Detects whether content is hidden behind a constant-height `sticky
 * top-0` bar. A zero-height sentinel is placed right below the bar; as
 * soon as that point stops being visible (offset by the bar's actual
 * height via rootMargin, not by the top of the viewport), we know the
 * user has scrolled and content is running under the bar.
 *
 * Shared by the ContentHeader variants: TopLevelHeader uses it to
 * crossfade the title via opacity, and both use it to trigger the
 * translucent/blurred background in the style of an iOS navigation bar.
 */
export function useScrolledPastBar<TBar extends HTMLElement>(): {
  barRef: RefObject<TBar | null>;
  sentinelRef: RefObject<HTMLDivElement | null>;
  isScrolled: boolean;
} {
  const barRef = useRef<TBar>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const bar = barRef.current;
    const sentinel = sentinelRef.current;
    if (!bar || !sentinel) return;
    const barHeight = bar.getBoundingClientRect().height;
    const observer = new IntersectionObserver(([entry]) => setIsScrolled(!entry.isIntersecting), {
      threshold: 0,
      rootMargin: `-${barHeight}px 0px 0px 0px`,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { barRef, sentinelRef, isScrolled };
}

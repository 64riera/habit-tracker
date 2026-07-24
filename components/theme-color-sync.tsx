"use client";

import { useEffect } from "react";
import { THEME_COLORS } from "@/lib/theme-colors";

function resolveThemeColor(html: HTMLElement) {
  const dark = html.classList.contains("dark");
  if (dark) return html.classList.contains("oled") ? THEME_COLORS.oled : THEME_COLORS.dark;
  return html.classList.contains("clear") ? THEME_COLORS.clear : THEME_COLORS.warm;
}

/** Keeps <meta name="theme-color"> — what actually tints the Android/Chrome
 * status bar and address bar, including in an installed PWA — in sync with
 * the live theme. It's only ever rendered server-side once, from RootLayout;
 * every toggle in Settings (ThemeToggle, DarkVariantToggle,
 * LightVariantToggle) updates <html>'s class list directly for instant
 * visual feedback without a page reload (see each one's own comment), so
 * without this the meta tag — and therefore the status bar — would keep
 * showing whatever was true at the last full navigation. Watching the class
 * list (the single source of truth all three already write to, including
 * next-themes' own light/dark toggling) means this stays correct no matter
 * which one changed, with no extra wiring needed in any of them. */
export function ThemeColorSync() {
  useEffect(() => {
    const html = document.documentElement;

    function sync() {
      const color = resolveThemeColor(html);
      const tags = document.querySelectorAll('meta[name="theme-color"]');
      // themePreference "system" renders two of these server-side, gated by
      // a prefers-color-scheme media query each. Only ever updates each
      // tag's `content` in place — never removes/replaces the node itself
      // — since these are also tracked by React's own head management;
      // detaching one out from under it throws on the next reconcile. Both
      // get the same resolved color: whichever one the OS's own light/dark
      // setting currently matches is the one that actually applies, and
      // the other stays correct and ready for when it flips.
      if (tags.length === 0) {
        const meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        meta.setAttribute("content", color);
        document.head.appendChild(meta);
        return;
      }
      tags.forEach((tag) => tag.setAttribute("content", color));
    }

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return null;
}

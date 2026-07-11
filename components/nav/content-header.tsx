"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { useScrolledPastBar } from "@/lib/hooks/use-scrolled-past-bar";
import { ThemeToggle } from "./theme-toggle";

/** Language is no longer something you change on the fly from any screen:
 * it's now an account preference, chosen once when the user is created (see
 * login/signup) and editable only from Settings. */
function HeaderControls({ showControls }: { showControls: boolean }) {
  if (!showControls) return null;
  return (
    <div className="shrink-0">
      <ThemeToggle />
    </div>
  );
}

/** Frosted glass for the fixed bar, iOS-style: opaque and flush with the
 * page until there's real content scrolling underneath, at which point it
 * becomes translucent + blur. The blur/saturation are always applied
 * (harmless against the opaque resting background) — `backdrop-filter`
 * itself is never animated, since that would be expensive; only
 * `background-color` and `box-shadow` transition, both cheap and layout-free.
 *
 * It must stay opaque at rest (not transparent): while the user scrolls,
 * TopLevelHeader's "hero" passes behind this bar before isScrolled
 * activates (it only activates once the hero is fully covered) — if the bar
 * were transparent during that stretch, the large title would show through
 * without blurring, with no layer to hide it.
 *
 * The separation from the content is a soft shadow + an almost invisible
 * hairline (tokens `--header-hairline`/`--header-shadow`, see globals.css)
 * instead of a solid border — in light mode the shadow does the work, in
 * dark mode the hairline carries more weight, because shadows are barely
 * noticeable against dark backgrounds. */
function barMaterialClass(isScrolled: boolean) {
  return cn(
    "backdrop-blur-xl backdrop-saturate-[1.2]",
    "transition-[background-color,box-shadow] duration-[320ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
    isScrolled
      ? "bg-bg/80 shadow-[0_1px_0_0_var(--header-hairline),0_18px_28px_-22px_var(--header-shadow)]"
      : "bg-bg shadow-[0_1px_0_0_transparent,0_18px_28px_-22px_transparent]"
  );
}

/** Top-level screens (Today, History, etc.): large title that scrolls away
 * with native scroll, and a compact version that crossfades in on the fixed
 * bar once the large title is covered.
 *
 * `headerAccessory` (optional, e.g. the live focus session chip) occupies
 * the same space as the compact title while the latter isn't shown yet:
 * while there's no scroll, the large hero below acts as the title, so that
 * gap on the left of the bar is free. As soon as `isScrolled` activates the
 * compact title, the accessory crossfades to `opacity-0` in the same
 * transition — they never compete for space. */
function TopLevelHeader({
  titleKey,
  subtitleKey,
  showControls,
  headerAccessory,
}: {
  titleKey: string;
  subtitleKey: string;
  showControls: boolean;
  headerAccessory?: React.ReactNode;
}) {
  const { t } = useI18n();
  const { barRef, sentinelRef: heroRef, isScrolled } = useScrolledPastBar<HTMLDivElement>();

  return (
    <>
      {/*
        Always constant height: nothing here changes size with scroll, so
        <main> never sees its scrollHeight fluctuate because of the header —
        that was what forced scroll jumps on pages with little content.
        Only the compact title's opacity (and the accessory's, if present)
        crossfades (GPU, doesn't trigger layout); the large title below
        scrolls away with the document's native scroll, with no size
        animation.
      */}
      <div
        ref={barRef}
        className={cn(
          "sticky top-0 z-10 flex items-center justify-between gap-4 py-2.5",
          barMaterialClass(isScrolled)
        )}
      >
        {/* grid (not absolute): title and accessory stack in the same
            cell, so the container's height is measured by the taller of
            the two instead of needing a fixed height set by hand. */}
        <div className="grid min-w-0 flex-1 items-center">
          <div
            className={cn(
              "col-start-1 row-start-1 truncate font-serif-italic text-[17px] leading-tight transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
              isScrolled ? "opacity-100" : "opacity-0"
            )}
            aria-hidden={!isScrolled}
          >
            {t(titleKey)}
          </div>
          {headerAccessory && (
            <div
              className={cn(
                "col-start-1 row-start-1 transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                isScrolled ? "pointer-events-none opacity-0" : "opacity-100"
              )}
              aria-hidden={isScrolled}
            >
              {headerAccessory}
            </div>
          )}
        </div>
        <HeaderControls showControls={showControls} />
      </div>

      <div ref={heroRef} className="pb-5 md:pb-[22px]">
        <div className="font-serif-italic text-[26px] leading-tight">{t(titleKey)}</div>
        <div className="mt-1 text-[12.5px] text-muted">{t(subtitleKey)}</div>
      </div>
    </>
  );
}

/** Subviews (outside the main nav, with a back arrow): the title lives only
 * in the fixed bar, always visible, no animation — they don't need the
 * large-title moment of top-level screens. */
function SubViewHeader({
  titleKey,
  subtitleKey,
  showControls,
  backHref,
}: {
  titleKey: string;
  subtitleKey: string;
  showControls: boolean;
  backHref: string;
}) {
  const { t } = useI18n();
  const { barRef, sentinelRef, isScrolled } = useScrolledPastBar<HTMLDivElement>();

  return (
    <>
      <div
        ref={barRef}
        className={cn(
          "sticky top-0 z-10 flex items-center justify-between gap-4 py-2.5",
          barMaterialClass(isScrolled)
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={backHref}
            aria-label={t("common.back")}
            className="-m-2 shrink-0 rounded-full p-2 text-muted"
          >
            <ArrowLeft size={17} strokeWidth={2} aria-hidden />
          </Link>
          <div className="truncate font-serif-italic text-[17px] leading-tight">{t(titleKey)}</div>
        </div>
        <HeaderControls showControls={showControls} />
      </div>
      {/* 1px sentinel: there's no "hero" in subviews, so this point marks
          where the actual content begins that could end up covered under
          the bar. A height of 0 would be ambiguous for the observer since
          it would fall right on the edge of its rootMargin; 1px resolves
          it without adding any perceptible space. */}
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <div className="pb-5 text-[12.5px] text-muted md:pb-[22px]">{t(subtitleKey)}</div>
    </>
  );
}

export function ContentHeader({
  titleKey,
  subtitleKey,
  showControls = true,
  backHref,
  headerAccessory,
}: {
  titleKey: string;
  subtitleKey: string;
  /** Settings already shows theme/language as its own rows; avoids showing them twice. */
  showControls?: boolean;
  /** Nested screens (not in the main nav) show a back arrow to return to the parent list. */
  backHref?: string;
  /** Only applies to top-level screens (without `backHref`): in nested ones
   * the title and back arrow are always visible, so there's never free
   * space in the bar to show it. */
  headerAccessory?: React.ReactNode;
}) {
  return backHref ? (
    <SubViewHeader
      titleKey={titleKey}
      subtitleKey={subtitleKey}
      showControls={showControls}
      backHref={backHref}
    />
  ) : (
    <TopLevelHeader
      titleKey={titleKey}
      subtitleKey={subtitleKey}
      showControls={showControls}
      headerAccessory={headerAccessory}
    />
  );
}

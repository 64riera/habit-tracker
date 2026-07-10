"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { useScrolledPastBar } from "@/lib/hooks/use-scrolled-past-bar";
import { LangToggle } from "@/components/nav/lang-toggle";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/branding";

export function LandingNav() {
  const { t } = useI18n();
  const { barRef, sentinelRef, isScrolled } = useScrolledPastBar<HTMLDivElement>();

  return (
    <>
      <div ref={sentinelRef} className="h-px" />
      <div
        ref={barRef}
        className={cn(
          "sticky top-0 z-20 backdrop-blur-xl backdrop-saturate-[1.2] transition-[background-color,box-shadow] duration-[320ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
          isScrolled
            ? "bg-bg/80 shadow-[0_1px_0_0_var(--header-hairline),0_18px_28px_-22px_var(--header-shadow)]"
            : "bg-bg shadow-[0_1px_0_0_transparent,0_18px_28px_-22px_transparent]"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-10">
          <div className="font-serif-italic text-lg font-semibold">{APP_NAME}</div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <LangToggle />
            </div>
            <ThemeToggle />
            <Link
              href="/signup"
              className="rounded-lg bg-text px-4 py-2 text-[13px] font-semibold text-surface transition-transform active:translate-y-px active:scale-[0.98]"
            >
              {t("auth.signupSubmit")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

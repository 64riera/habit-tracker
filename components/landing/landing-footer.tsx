"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { LangToggle } from "@/components/nav/lang-toggle";
import { APP_NAME } from "@/lib/branding";

export function LandingFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-10">
        <div>
          <div className="font-serif-italic text-base font-semibold">{APP_NAME}</div>
          <p className="mt-1 text-[12px] text-muted">{t("landing.footer.tagline")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-[13px]">
          <Link href="/login" className="font-medium text-muted transition-colors hover:text-text">
            {t("auth.loginLink")}
          </Link>
          <Link href="/signup" className="font-medium text-muted transition-colors hover:text-text">
            {t("auth.signupSubmit")}
          </Link>
          <LangToggle />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 pb-8 text-[11px] text-muted md:px-10">
        {t("landing.footer.rights", { year })}
      </div>
    </footer>
  );
}

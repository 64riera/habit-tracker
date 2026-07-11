import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasValidSession } from "@/lib/auth/session";
import { resolvePreAuthLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { translate } from "@/lib/i18n/t";
import { APP_NAME_FULL } from "@/lib/branding";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { FeatureBento } from "@/components/landing/feature-bento";
import { CategoriesShowcase } from "@/components/landing/categories-showcase";
import { ExtrasGrid } from "@/components/landing/extras-grid";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolvePreAuthLocale();
  const dict = getDictionary(locale);
  const description = translate(dict, "landing.meta.description");
  return {
    title: APP_NAME_FULL,
    description,
    openGraph: {
      title: APP_NAME_FULL,
      description,
      type: "website",
      url: "/welcome",
    },
    twitter: {
      card: "summary_large_image",
      title: APP_NAME_FULL,
      description,
    },
  };
}

export default async function BienvenidaPage() {
  if (await hasValidSession()) {
    redirect("/");
  }

  return (
    <div className="bg-bg text-text">
      <LandingNav />
      <main>
        <LandingHero />
        <FeatureBento />
        <CategoriesShowcase />
        <ExtrasGrid />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}

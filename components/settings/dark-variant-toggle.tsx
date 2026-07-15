"use client";

import { useState, useTransition } from "react";
import { Moon, MoonStar } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { setDarkVariant } from "@/lib/actions/preferences";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/segmented-control";
import type { DarkVariant } from "@/lib/queries/user";

const OPTIONS = ["original", "oled"] as const;

/** Only visible while dark mode is active (see .dark.oled in
 * app/globals.css); not tracked by next-themes, so the "oled" class on
 * <html> is toggled by hand here for instant feedback. */
export function DarkVariantToggle({ initialVariant }: { initialVariant: DarkVariant }) {
  const { t } = useI18n();
  const [variant, setVariant] = useState<DarkVariant>(initialVariant);
  const [, startTransition] = useTransition();

  const label = (opt: DarkVariant) =>
    opt === "original" ? t("settings.darkVariantOriginal") : t("settings.darkVariantOled");

  const options: SegmentedControlOption<DarkVariant>[] = OPTIONS.map((opt) => ({
    value: opt,
    label: label(opt),
    icon: opt === "original" ? Moon : MoonStar,
  }));

  function handleChange(opt: DarkVariant) {
    setVariant(opt);
    document.documentElement.classList.toggle("oled", opt === "oled");
    startTransition(() => {
      void setDarkVariant(opt);
    });
  }

  return (
    <SegmentedControl
      options={options}
      value={variant}
      onChange={handleChange}
      ariaLabel={t("settings.darkVariant")}
    />
  );
}

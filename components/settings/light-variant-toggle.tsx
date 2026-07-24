"use client";

import { useState, useTransition } from "react";
import { Sun, SunDim } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { setLightVariant } from "@/lib/actions/preferences";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/segmented-control";
import type { LightVariant } from "@/lib/queries/user";

const OPTIONS = ["warm", "clear"] as const;

/** Only visible while light mode is active (see .light.clear in
 * app/globals.css); not tracked by next-themes, so the "clear" class on
 * <html> is toggled by hand here for instant feedback. */
export function LightVariantToggle({ initialVariant }: { initialVariant: LightVariant }) {
  const { t } = useI18n();
  const [variant, setVariant] = useState<LightVariant>(initialVariant);
  const [, startTransition] = useTransition();

  const label = (opt: LightVariant) =>
    opt === "warm" ? t("settings.lightVariantWarm") : t("settings.lightVariantClear");

  const options: SegmentedControlOption<LightVariant>[] = OPTIONS.map((opt) => ({
    value: opt,
    label: label(opt),
    icon: opt === "warm" ? Sun : SunDim,
  }));

  function handleChange(opt: LightVariant) {
    setVariant(opt);
    document.documentElement.classList.toggle("clear", opt === "clear");
    startTransition(() => {
      void setLightVariant(opt);
    });
  }

  return (
    <SegmentedControl
      options={options}
      value={variant}
      onChange={handleChange}
      ariaLabel={t("settings.lightVariant")}
    />
  );
}

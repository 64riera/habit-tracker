"use client";

import { useTransition } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useHasMounted } from "@/lib/hooks/use-has-mounted";
import { useI18n } from "@/lib/i18n/client";
import { setThemePreference } from "@/lib/actions/preferences";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/segmented-control";

const OPTIONS = ["light", "dark", "system"] as const;
type ThemeOption = (typeof OPTIONS)[number];

const ICONS = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const mounted = useHasMounted();
  const [, startTransition] = useTransition();
  const current: ThemeOption = mounted && OPTIONS.includes(theme as ThemeOption) ? (theme as ThemeOption) : "system";

  const label = (opt: ThemeOption) =>
    opt === "light" ? t("settings.themeLight") : opt === "dark" ? t("settings.themeDark") : t("settings.themeSystem");

  const options: SegmentedControlOption<ThemeOption>[] = OPTIONS.map((opt) => ({
    value: opt,
    label: label(opt),
    icon: ICONS[opt],
  }));

  function handleChange(opt: ThemeOption) {
    setTheme(opt);
    // Saves the preference to the account so it follows the user across
    // devices; the visual change already happened immediately above.
    startTransition(() => {
      void setThemePreference(opt);
    });
  }

  return (
    <SegmentedControl options={options} value={current} onChange={handleChange} ariaLabel={t("settings.theme")} />
  );
}

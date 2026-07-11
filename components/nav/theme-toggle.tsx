"use client";

import { useTransition } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useHasMounted } from "@/lib/hooks/use-has-mounted";
import { useI18n } from "@/lib/i18n/client";
import { setThemePreference } from "@/lib/actions/preferences";

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

  function handleChange(opt: ThemeOption) {
    setTheme(opt);
    // Saves the preference to the account so it follows the user across
    // devices; the visual change already happened immediately above.
    startTransition(() => {
      void setThemePreference(opt);
    });
  }

  return (
    <div
      role="group"
      aria-label={t("settings.theme")}
      className="flex gap-[2px] rounded-full bg-border p-[2px]"
    >
      {OPTIONS.map((opt) => {
        const active = current === opt;
        const Icon = ICONS[opt];
        return (
          <button
            type="button"
            key={opt}
            onClick={() => handleChange(opt)}
            aria-pressed={active}
            aria-label={label(opt)}
            title={label(opt)}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-full transition-colors md:h-[26px] md:w-[26px]"
            style={{
              background: active ? "var(--color-accent)" : "transparent",
              color: active ? "var(--color-accent-contrast)" : "var(--color-muted)",
            }}
          >
            <Icon size={13} strokeWidth={2.2} />
          </button>
        );
      })}
    </div>
  );
}

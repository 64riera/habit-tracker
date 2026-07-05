"use client";

import { useTransition } from "react";
import { useTheme } from "next-themes";
import { useHasMounted } from "@/lib/hooks/use-has-mounted";
import { useI18n } from "@/lib/i18n/client";
import { setThemePreference } from "@/lib/actions/preferences";

const OPTIONS = ["light", "dark", "system"] as const;
type ThemeOption = (typeof OPTIONS)[number];

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
    // Guarda la preferencia en la cuenta para que siga al usuario entre
    // dispositivos; el cambio visual ya ocurrio de inmediato arriba.
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
        return (
          <button
            type="button"
            key={opt}
            onClick={() => handleChange(opt)}
            aria-pressed={active}
            className="rounded-full px-[9px] py-[4px] text-[10px] font-semibold transition-colors md:px-[11px] md:py-[5px] md:text-[11px]"
            style={{
              background: active ? "var(--color-accent)" : "transparent",
              color: active ? "var(--color-accent-contrast)" : "var(--color-muted)",
            }}
          >
            {label(opt)}
          </button>
        );
      })}
    </div>
  );
}

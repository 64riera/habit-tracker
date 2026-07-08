import type { LogStatus } from "./status";

export type StatusVisual = { border: string; background: string; icon: string | null; iconColor: string };

/**
 * Mapeo único de status de check-in a glyph/color, compartido por el botón
 * de check de Hoy (HabitCheckRow) y el glyph de solo lectura del registro en
 * Historial — mismo vocabulario visual (✓ J – ❄ ×) en toda la app en vez de
 * reinventarlo por pantalla.
 */
export function getStatusVisual(status: LogStatus | null, progressPct = 100): StatusVisual {
  switch (status) {
    case "done":
      return { border: "var(--color-accent)", background: "var(--color-accent)", icon: "✓", iconColor: "var(--color-accent-contrast)" };
    case "partial":
      return {
        border: "var(--color-accent)",
        background: `linear-gradient(90deg, var(--color-accent) ${progressPct}%, transparent ${progressPct}%)`,
        icon: null,
        iconColor: "",
      };
    case "justified":
      return { border: "var(--color-muted)", background: "transparent", icon: "J", iconColor: "var(--color-muted)" };
    case "skipped":
      return { border: "var(--color-border)", background: "color-mix(in srgb, var(--color-text) 8%, transparent)", icon: "–", iconColor: "var(--color-muted)" };
    case "frozen":
      return { border: "var(--color-accent)", background: "transparent", icon: "❄", iconColor: "var(--color-accent)" };
    case "missed":
      return { border: "var(--color-border)", background: "color-mix(in srgb, var(--color-text) 14%, transparent)", icon: "×", iconColor: "var(--color-muted)" };
    default:
      return { border: "var(--color-border)", background: "transparent", icon: null, iconColor: "" };
  }
}

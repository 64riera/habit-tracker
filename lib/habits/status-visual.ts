import type { LogStatus } from "./status";

export type StatusVisual = { border: string; background: string; icon: string | null; iconColor: string };

/**
 * Single mapping from check-in status to glyph/color, shared by the check
 * button in Today (HabitCheckRow) and the read-only glyph in the History
 * log — same visual vocabulary (✓ J – ❄ ×) across the whole app instead of
 * reinventing it per screen.
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

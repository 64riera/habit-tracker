import { getStatusVisual } from "@/lib/habits/status-visual";
import type { LogStatus } from "@/lib/habits/status";

/** Versión de solo lectura (sin botón) del glyph de check de Hoy — mismo
 * vocabulario visual (✓ J – ❄ ×), usado en el registro de Historial. */
export function StatusGlyph({ status, size = 20 }: { status: string; size?: number }) {
  const visual = getStatusVisual(status as LogStatus);
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full border-[1.5px]"
      style={{ width: size, height: size, borderColor: visual.border, background: visual.background }}
    >
      {visual.icon && (
        <span style={{ fontSize: Math.round(size * 0.5), color: visual.iconColor, lineHeight: 1 }}>
          {visual.icon}
        </span>
      )}
    </span>
  );
}

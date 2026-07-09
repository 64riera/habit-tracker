"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Timer } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useFocusRewardToast } from "@/lib/toast/client";
import { useLiveFocusState } from "@/lib/focus/use-live-focus-state";
import { useFocusStatusAlerts } from "@/lib/focus/use-focus-status-alerts";
import { getActiveFocusSessionAction } from "@/lib/actions/focus";
import { formatClock } from "@/lib/focus/format";
import { LIVE_STATUSES, type FocusSessionRow } from "@/lib/focus/compute";
import { hasFocusHeaderSlot } from "@/lib/focus/header-slot";

/**
 * Pastilla flotante visible en cualquier ruta del dashboard salvo /enfoque
 * (ahí ya se ve la sesión completa) y las de `hasFocusHeaderSlot` (esas
 * pantallas muestran el mismo estado como `FocusHeaderChip` en su propio
 * header, que además es quien dispara ahí las alertas de sonido/título —
 * evita que ambos estén montados a la vez y las dupliquen). Solo monta el
 * hook de ticking si hay una sesión activa de entrada — si no, no hay
 * `setInterval` corriendo para siempre en cada página de la app sin nada
 * que mostrar.
 */
export function MiniFocusIndicator({
  session,
  soundEnabled,
}: {
  session: FocusSessionRow | null;
  soundEnabled: boolean;
}) {
  if (!session) return null;
  return <MiniFocusIndicatorActive initialSession={session} soundEnabled={soundEnabled} />;
}

function MiniFocusIndicatorActive({
  initialSession,
  soundEnabled,
}: {
  initialSession: FocusSessionRow;
  soundEnabled: boolean;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const notifyRewards = useFocusRewardToast();
  const { session, state } = useLiveFocusState(initialSession, getActiveFocusSessionAction, notifyRewards);
  useFocusStatusAlerts(session, soundEnabled);

  if (!session || !state || !LIVE_STATUSES.includes(session.status)) return null;
  if (pathname.startsWith("/enfoque") || hasFocusHeaderSlot(pathname)) return null;

  const bigValueSeconds = session.mode === "countdown" ? state.remainingSeconds ?? 0 : state.activeSeconds;

  return (
    <Link
      href="/enfoque"
      className="fixed right-4 bottom-20 z-40 flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-[12px] shadow-[0_10px_24px_-14px_var(--header-shadow)] md:right-6 md:bottom-6"
    >
      <Timer size={13} strokeWidth={2} className="text-muted" aria-hidden />
      <span className="font-medium tabular-nums">{formatClock(bigValueSeconds)}</span>
      <span className="text-muted">{t(`focus.status.${session.status}`)}</span>
    </Link>
  );
}

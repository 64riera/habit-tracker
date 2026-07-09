"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { useFocusRewardToast } from "@/lib/toast/client";
import { useLiveFocusState } from "@/lib/focus/use-live-focus-state";
import { useFocusStatusAlerts } from "@/lib/focus/use-focus-status-alerts";
import { getActiveFocusSessionAction } from "@/lib/actions/focus";
import { formatClock } from "@/lib/focus/format";
import { LIVE_STATUSES, type FocusSessionRow } from "@/lib/focus/compute";

/**
 * Chip de sesión de enfoque en vivo, para el slot `headerAccessory` de
 * `ContentHeader` en Hoy. Solo existe mientras hay una sesión en curso — sin
 * sesión no hay nada que mostrar ahí (para eso ya está la pestaña "Enfoque"
 * de la nav). Reemplaza al `MiniFocusIndicator` flotante mientras se está en
 * Hoy (ver el `pathname === "/"` en ese componente) — nunca están montados
 * los dos a la vez, así que el ticking/alertas de sonido y título viven acá
 * sin riesgo de duplicarse.
 */
export function FocusHeaderChip({
  session,
  soundEnabled,
}: {
  session: FocusSessionRow | null;
  soundEnabled: boolean;
}) {
  if (!session) return null;
  return <ActiveChip initialSession={session} soundEnabled={soundEnabled} />;
}

function ActiveChip({
  initialSession,
  soundEnabled,
}: {
  initialSession: FocusSessionRow;
  soundEnabled: boolean;
}) {
  const { t } = useI18n();
  const notifyRewards = useFocusRewardToast();
  const { session, state } = useLiveFocusState(initialSession, getActiveFocusSessionAction, notifyRewards);
  useFocusStatusAlerts(session, soundEnabled);

  if (!session || !state || !LIVE_STATUSES.includes(session.status)) return null;

  const bigValueSeconds = session.mode === "countdown" ? (state.remainingSeconds ?? 0) : state.activeSeconds;

  return (
    <Link
      href="/enfoque"
      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11.5px] font-medium tabular-nums transition-colors"
    >
      <span className="relative flex size-1.5 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
      </span>
      <span>{formatClock(bigValueSeconds)}</span>
      <span className="text-muted">{t(`focus.status.${session.status}`)}</span>
    </Link>
  );
}

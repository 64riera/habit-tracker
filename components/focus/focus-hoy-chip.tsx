"use client";

import Link from "next/link";
import { Timer } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useFocusRewardToast } from "@/lib/toast/client";
import { useLiveFocusState } from "@/lib/focus/use-live-focus-state";
import { useFocusStatusAlerts } from "@/lib/focus/use-focus-status-alerts";
import { getActiveFocusSessionAction } from "@/lib/actions/focus";
import { formatClock } from "@/lib/focus/format";
import { LIVE_STATUSES, type FocusSessionRow } from "@/lib/focus/compute";

const CHIP_CLASS =
  "inline-flex items-center gap-2 self-start rounded-full border border-border px-3 py-1.5 text-[11.5px] font-medium tabular-nums transition-colors";

/**
 * Chip de Enfoque en la pantalla Hoy: invitación discreta cuando no hay
 * sesión, estado en vivo cuando la hay. Reemplaza al `MiniFocusIndicator`
 * flotante mientras se está en Hoy (ver el `pathname === "/"` en ese
 * componente) — nunca están montados los dos a la vez, así que el
 * ticking/alertas de sonido y título viven acá sin riesgo de duplicarse.
 */
export function FocusHoyChip({
  session,
  soundEnabled,
}: {
  session: FocusSessionRow | null;
  soundEnabled: boolean;
}) {
  if (!session) return <IdleChip />;
  return <ActiveChip initialSession={session} soundEnabled={soundEnabled} />;
}

function IdleChip() {
  const { t } = useI18n();
  return (
    <Link href="/enfoque" className={`${CHIP_CLASS} text-muted hover:text-text`}>
      <Timer size={13} strokeWidth={2} aria-hidden />
      {t("focus.cta")}
    </Link>
  );
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

  if (!session || !state || !LIVE_STATUSES.includes(session.status)) return <IdleChip />;

  const bigValueSeconds = session.mode === "countdown" ? (state.remainingSeconds ?? 0) : state.activeSeconds;

  return (
    <Link href="/enfoque" className={CHIP_CLASS}>
      <span className="relative flex size-1.5 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
      </span>
      <span>{formatClock(bigValueSeconds)}</span>
      <span className="text-muted">{t(`focus.status.${session.status}`)}</span>
    </Link>
  );
}

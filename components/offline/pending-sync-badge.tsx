"use client";

import { RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

/** Indicador visual de "aún no sincronizado" — solo ícono, sin texto acompañante. */
export function PendingSyncBadge() {
  const { t } = useI18n();
  return (
    <span
      className="inline-flex shrink-0 items-center"
      role="img"
      aria-label={t("offline.pendingItem")}
      title={t("offline.pendingItem")}
    >
      <RefreshCw size={11} strokeWidth={2.2} aria-hidden style={{ color: "var(--color-muted)" }} />
    </span>
  );
}

"use client";

import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";

export default function HistorialPage() {
  const { t } = useI18n();
  return (
    <div>
      <ContentHeader titleKey="screens.historial.title" subtitleKey="screens.historial.subtitle" />
      <p className="text-sm text-muted">{t("history.empty")}</p>
    </div>
  );
}

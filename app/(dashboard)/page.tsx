"use client";

import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";

export default function HoyPage() {
  const { t } = useI18n();
  return (
    <div>
      <ContentHeader titleKey="screens.hoy.title" subtitleKey="screens.hoy.subtitle" />
      <p className="text-sm text-muted">{t("checkin.noHabitsToday")}</p>
    </div>
  );
}

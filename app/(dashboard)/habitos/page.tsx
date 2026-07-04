"use client";

import { ContentHeader } from "@/components/nav/content-header";
import { useI18n } from "@/lib/i18n/client";

export default function HabitosPage() {
  const { t } = useI18n();
  return (
    <div>
      <ContentHeader titleKey="screens.habitos.title" subtitleKey="screens.habitos.subtitle" />
      <p className="text-sm text-muted">{t("habit.empty")}</p>
    </div>
  );
}

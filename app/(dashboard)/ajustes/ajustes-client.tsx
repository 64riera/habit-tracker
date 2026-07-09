"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { LangToggle } from "@/components/nav/lang-toggle";
import { FocusHeaderChip } from "@/components/focus/focus-header-chip";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { logout } from "@/lib/actions/auth";
import { setDayCutoffHour } from "@/lib/actions/preferences";
import type { FocusHeaderData } from "@/lib/queries/focus";

const CUTOFF_HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, "0")}:00`,
}));

export function AjustesClient({
  cutoffHour,
  focusHeader,
}: {
  cutoffHour: number;
  focusHeader: FocusHeaderData;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onCutoffChange(hour: number) {
    startTransition(async () => {
      await setDayCutoffHour(hour);
      // El corte del dia cambia que fecha es "hoy" para todas las paginas;
      // router.refresh() vuelve a pedir esos datos sin recargar el navegador.
      router.refresh();
    });
  }

  // Tema e idioma usan los mismos controles interactivos del header, para
  // que esta fila haga lo que dice en vez de solo mostrar el valor actual.
  const rows: { label: string; sub?: string; control: React.ReactNode }[] = [
    { label: t("settings.theme"), control: <ThemeToggle /> },
    { label: t("settings.language"), control: <LangToggle /> },
    {
      label: t("settings.dayCutoff"),
      sub: t("settings.dayCutoffSub"),
      control: (
        <Select
          variant="pill"
          value={String(cutoffHour)}
          onValueChange={(v) => onCutoffChange(Number(v))}
          options={CUTOFF_HOURS}
          ariaLabel={t("settings.dayCutoff")}
          className={isPending ? "pointer-events-none opacity-60" : undefined}
        />
      ),
    },
  ];

  return (
    <div>
      <ContentHeader
        titleKey="screens.ajustes.title"
        subtitleKey="screens.ajustes.subtitle"
        showControls={false}
        headerAccessory={<FocusHeaderChip session={focusHeader.session} soundEnabled={focusHeader.soundEnabled} />}
      />

      <div className="flex flex-col">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-border py-3.5">
            <div>
              <div className="text-[13.5px] font-medium">{row.label}</div>
              {row.sub && <div className="mt-0.5 text-[11px] text-muted">{row.sub}</div>}
            </div>
            {row.control}
          </div>
        ))}
      </div>

      <form action={logout} className="mt-6">
        <button type="submit" className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
          <LogOut size={14} strokeWidth={2} aria-hidden />
          {t("settings.logout")}
        </button>
      </form>
    </div>
  );
}

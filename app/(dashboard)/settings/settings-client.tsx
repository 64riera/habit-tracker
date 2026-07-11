"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ContentHeader } from "@/components/nav/content-header";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { LangToggle } from "@/components/nav/lang-toggle";
import { FocusHeaderChip } from "@/components/focus/focus-header-chip";
import { PushToggle } from "@/components/pwa/push-toggle";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { useInstallPrompt } from "@/lib/hooks/use-install-prompt";
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
  const { canInstall, isIOSManual, promptInstall } = useInstallPrompt();

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
      label: t("settings.notifications"),
      sub: t("settings.notificationsSub"),
      control: <PushToggle />,
    },
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

  // Solo se ofrece instalar si el navegador realmente puede hacer algo con
  // el click: Chrome/Edge/Android disparan un prompt nativo (canInstall);
  // Safari/iOS no tiene ese evento, así que ahí se muestran instrucciones en
  // vez de un botón. Si ya está instalada (modo standalone) o el navegador
  // no soporta instalación (p. ej. Firefox de escritorio), no se muestra nada.
  if (canInstall) {
    rows.push({
      label: t("settings.installApp"),
      sub: t("pwa.installBody"),
      control: (
        <button
          type="button"
          onClick={promptInstall}
          className="rounded-full border border-border px-3 py-1 text-[11.5px] font-medium"
        >
          {t("pwa.install")}
        </button>
      ),
    });
  } else if (isIOSManual) {
    rows.push({ label: t("settings.installApp"), sub: t("pwa.installIos"), control: null });
  }

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

      {/* POST normal a un Route Handler (no Server Action): ver el comentario
          en app/api/auth/logout/route.ts — evita que Next intente refrescar
          esta misma pantalla, ya autenticada, justo después de cerrar sesión. */}
      <form action="/api/auth/logout" method="post" className="mt-6">
        <button type="submit" className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
          <LogOut size={14} strokeWidth={2} aria-hidden />
          {t("settings.logout")}
        </button>
      </form>
    </div>
  );
}

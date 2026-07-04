"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ContentHeader } from "@/components/nav/content-header";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { LangToggle } from "@/components/nav/lang-toggle";
import { useI18n } from "@/lib/i18n/client";
import { logout } from "@/lib/actions/auth";
import { setDayCutoffHour } from "@/lib/actions/preferences";

export function AjustesClient({ cutoffHour }: { cutoffHour: number }) {
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
        <select
          defaultValue={cutoffHour}
          disabled={isPending}
          onChange={(e) => onCutoffChange(Number(e.target.value))}
          className="rounded-md border border-border bg-transparent px-2 py-1 text-[12.5px] font-medium text-muted"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div>
      <ContentHeader titleKey="screens.ajustes.title" subtitleKey="screens.ajustes.subtitle" />

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
        <button type="submit" className="text-[12.5px] font-medium text-muted">
          {t("settings.logout")}
        </button>
      </form>
    </div>
  );
}

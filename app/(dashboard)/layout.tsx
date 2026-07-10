import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { MiniFocusIndicator } from "@/components/focus/mini-focus-indicator";
import { TimezoneSync } from "@/components/pwa/timezone-sync";
import { getStreakMax } from "@/lib/streaks";
import { getFocusHeaderData } from "@/lib/queries/focus";
import { getTimezonePreference } from "@/lib/queries/user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [streakMax, focusHeader, timezone] = await Promise.all([
    getStreakMax(),
    getFocusHeaderData(),
    getTimezonePreference(),
  ]);

  return (
    // Shell fijo al viewport (h-dvh + overflow-hidden): el header y el bottom
    // nav quedan estructuralmente fuera del área que scrollea, en vez de
    // depender de position:fixed/sticky sobre el scroll del documento, que
    // es poco confiable en navegadores móviles reales. <main> es el único
    // contenedor con scroll interno.
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <Sidebar streakMax={streakMax} />
      {/*
        overflow-anchor:none evita que el "scroll anchoring" del navegador
        (activado por default) pelee con el header sticky que cambia de
        alto al engancharse arriba: sin esto, el navegador intenta
        compensar ese cambio de tamaño reajustando el scroll el mismo
        frame, y con scroll lento esa compensación gana y el scroll se
        resetea en un loop visible como glitch.
      */}
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 overflow-y-auto px-5 pb-6 [overflow-anchor:none] md:px-10 md:pb-9">
        {children}
      </main>
      <MiniFocusIndicator session={focusHeader.session} soundEnabled={focusHeader.soundEnabled} />
      <BottomNav />
      <TimezoneSync savedTimezone={timezone} />
    </div>
  );
}

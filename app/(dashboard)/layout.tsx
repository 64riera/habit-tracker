import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { MiniFocusIndicator } from "@/components/focus/mini-focus-indicator";
import { getStreakMax } from "@/lib/streaks";
import { getActiveFocusSession, getFocusSettings } from "@/lib/queries/focus";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [streakMax, focusSession, focusSettings] = await Promise.all([
    getStreakMax(),
    getActiveFocusSession(),
    getFocusSettings(),
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
      <MiniFocusIndicator session={focusSession} soundEnabled={focusSettings.soundEnabled} />
      <BottomNav />
    </div>
  );
}

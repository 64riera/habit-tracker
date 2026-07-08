import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { getStreakMax } from "@/lib/streaks";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const streakMax = await getStreakMax();

  return (
    // Shell fijo al viewport (h-dvh + overflow-hidden): el header y el bottom
    // nav quedan estructuralmente fuera del área que scrollea, en vez de
    // depender de position:fixed/sticky sobre el scroll del documento, que
    // es poco confiable en navegadores móviles reales. <main> es el único
    // contenedor con scroll interno.
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <Sidebar streakMax={streakMax} />
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 overflow-y-auto px-5 pb-6 md:px-10 md:pb-9">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

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
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar streakMax={streakMax} />
      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-5 pt-7 pb-24 md:px-10 md:py-9 md:pb-9">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

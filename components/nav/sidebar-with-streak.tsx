import { getDashboardShellCounts } from "@/lib/queries/dashboard-shell";
import { Sidebar } from "./sidebar";

/** Split from the layout so the streak lookup can stream in behind its own
 * <Suspense> instead of blocking the whole shell (see
 * app/(dashboard)/layout.tsx) — same reasoning as TodayHabits. */
export async function SidebarWithStreak() {
  const { streakMax } = await getDashboardShellCounts();
  return <Sidebar streakMax={streakMax} />;
}

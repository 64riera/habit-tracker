import { Home, Timer, Wallet, LayoutGrid } from "lucide-react";

export const NAV_ITEMS = [
  { key: "hoy", href: "/", dictKey: "nav.hoy", icon: Home, activeWhen: (p: string) => p === "/" },
  { key: "enfoque", href: "/focus", dictKey: "nav.enfoque", icon: Timer, activeWhen: (p: string) => p.startsWith("/focus") },
  { key: "finance", href: "/finance", dictKey: "nav.finance", icon: Wallet, activeWhen: (p: string) => p.startsWith("/finance") },
  {
    key: "more",
    href: "/more",
    dictKey: "nav.more",
    icon: LayoutGrid,
    // Habits, History/Stats, Gym, Tasks and Settings all live under this
    // one entry (see components/nav/more-items.ts) instead of each taking
    // their own nav slot — this is the hub that groups the rest of the
    // sections so the bottom nav doesn't keep growing every time a new one
    // is added.
    activeWhen: (p: string) =>
      p.startsWith("/more") ||
      p.startsWith("/gym") ||
      p.startsWith("/tasks") ||
      p.startsWith("/settings") ||
      p.startsWith("/habits") ||
      p.startsWith("/history") ||
      p.startsWith("/stats"),
  },
] as const;

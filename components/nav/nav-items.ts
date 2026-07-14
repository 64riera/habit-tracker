import { Home, History, Timer, ListChecks, Wallet, LayoutGrid } from "lucide-react";

export const NAV_ITEMS = [
  { key: "hoy", href: "/", dictKey: "nav.hoy", icon: Home, activeWhen: (p: string) => p === "/" },
  {
    key: "historial",
    href: "/history",
    dictKey: "nav.historial",
    icon: History,
    // History and Statistics share a single nav item: they're two
    // independent routes presented as one section, joined by the segmented
    // control in SegmentedRouteTabs (see that screen).
    activeWhen: (p: string) => p.startsWith("/history") || p.startsWith("/stats"),
  },
  { key: "enfoque", href: "/focus", dictKey: "nav.enfoque", icon: Timer, activeWhen: (p: string) => p.startsWith("/focus") },
  { key: "habitos", href: "/habits", dictKey: "nav.habitos", icon: ListChecks, activeWhen: (p: string) => p.startsWith("/habits") },
  { key: "finance", href: "/finance", dictKey: "nav.finance", icon: Wallet, activeWhen: (p: string) => p.startsWith("/finance") },
  {
    key: "more",
    href: "/more",
    dictKey: "nav.more",
    icon: LayoutGrid,
    // Gym, Tasks and Settings live under this one entry (see
    // components/nav/more-items.ts) instead of each taking their own nav
    // slot — this is the hub that groups occasional-use utilities so the
    // bottom nav doesn't keep growing every time a new one is added.
    activeWhen: (p: string) =>
      p.startsWith("/more") || p.startsWith("/gym") || p.startsWith("/tasks") || p.startsWith("/settings"),
  },
] as const;

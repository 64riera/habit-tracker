import { Home, History, Timer, ListChecks, ListTodo, Wallet, Settings } from "lucide-react";

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
  { key: "tareas", href: "/tasks", dictKey: "nav.tareas", icon: ListTodo, activeWhen: (p: string) => p.startsWith("/tasks") },
  { key: "finance", href: "/finance", dictKey: "nav.finance", icon: Wallet, activeWhen: (p: string) => p.startsWith("/finance") },
  { key: "ajustes", href: "/settings", dictKey: "nav.ajustes", icon: Settings, activeWhen: (p: string) => p.startsWith("/settings") },
] as const;

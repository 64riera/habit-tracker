import { Home, History, Timer, ListChecks, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { key: "hoy", href: "/", dictKey: "nav.hoy", icon: Home, activeWhen: (p: string) => p === "/" },
  {
    key: "historial",
    href: "/history",
    dictKey: "nav.historial",
    icon: History,
    // Historial y Estadísticas comparten un solo ítem de nav: son dos rutas
    // independientes presentadas como una misma sección, unidas por el
    // segmented control en SegmentedRouteTabs (ver esa pantalla).
    activeWhen: (p: string) => p.startsWith("/history") || p.startsWith("/stats"),
  },
  { key: "enfoque", href: "/focus", dictKey: "nav.enfoque", icon: Timer, activeWhen: (p: string) => p.startsWith("/focus") },
  { key: "habitos", href: "/habits", dictKey: "nav.habitos", icon: ListChecks, activeWhen: (p: string) => p.startsWith("/habits") },
  { key: "ajustes", href: "/settings", dictKey: "nav.ajustes", icon: Settings, activeWhen: (p: string) => p.startsWith("/settings") },
] as const;

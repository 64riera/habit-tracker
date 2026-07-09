import { Home, History, Timer, ListChecks, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { key: "hoy", href: "/", dictKey: "nav.hoy", icon: Home, activeWhen: (p: string) => p === "/" },
  {
    key: "historial",
    href: "/historial",
    dictKey: "nav.historial",
    icon: History,
    // Historial y Estadísticas comparten un solo ítem de nav: son dos rutas
    // independientes presentadas como una misma sección, unidas por el
    // segmented control en HistorialTabs (ver esa pantalla).
    activeWhen: (p: string) => p.startsWith("/historial") || p.startsWith("/estadisticas"),
  },
  { key: "enfoque", href: "/enfoque", dictKey: "nav.enfoque", icon: Timer, activeWhen: (p: string) => p.startsWith("/enfoque") },
  { key: "habitos", href: "/habitos", dictKey: "nav.habitos", icon: ListChecks, activeWhen: (p: string) => p.startsWith("/habitos") },
  { key: "ajustes", href: "/ajustes", dictKey: "nav.ajustes", icon: Settings, activeWhen: (p: string) => p.startsWith("/ajustes") },
] as const;

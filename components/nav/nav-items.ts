import { Home, History, BarChart3, ListChecks, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { key: "hoy", href: "/", dictKey: "nav.hoy", icon: Home },
  { key: "historial", href: "/historial", dictKey: "nav.historial", icon: History },
  { key: "estadisticas", href: "/estadisticas", dictKey: "nav.estadisticas", icon: BarChart3 },
  { key: "habitos", href: "/habitos", dictKey: "nav.habitos", icon: ListChecks },
  { key: "ajustes", href: "/ajustes", dictKey: "nav.ajustes", icon: Settings },
] as const;

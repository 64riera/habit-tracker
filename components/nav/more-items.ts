import { Dumbbell, Settings, ListChecks, History, Metronome } from "lucide-react";

/** Utilities grouped under the "Más" hub (see components/nav/nav-items.ts) —
 * add new ones here as they show up; the grid in app/(dashboard)/more
 * renders whatever's in this list, no other wiring needed. Habits and
 * History/Stats use their own "more.*" labels here (distinct from the ones
 * used elsewhere, e.g. their own page headers still say "Hábitos"/
 * "Historial") — "Administrar hábitos"/"Historial y estadísticas" describe
 * what tapping the tile does from this hub, same reasoning a nav label and
 * a screen title don't have to say the same thing. Tasks moved back out to
 * its own bottom-nav slot (see nav-items.ts), so it's no longer listed here. */
export const MORE_ITEMS = [
  { key: "habitos", href: "/habits", dictKey: "more.manageHabits", icon: ListChecks },
  { key: "historial", href: "/history", dictKey: "more.historyStats", icon: History },
  { key: "gym", href: "/gym", dictKey: "nav.gym", icon: Dumbbell },
  { key: "metronomo", href: "/metronome", dictKey: "nav.metronome", icon: Metronome },
  { key: "ajustes", href: "/settings", dictKey: "nav.ajustes", icon: Settings },
] as const;

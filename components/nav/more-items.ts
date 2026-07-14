import { Dumbbell, ListTodo, Settings, ListChecks, History } from "lucide-react";

/** Utilities grouped under the "Más" hub (see components/nav/nav-items.ts) —
 * add new ones here as they show up; the grid in app/(dashboard)/more
 * renders whatever's in this list, no other wiring needed. Habits and
 * History/Stats use their own "more.*" labels here (distinct from the ones
 * used elsewhere, e.g. their own page headers still say "Hábitos"/
 * "Historial") — "Administrar hábitos"/"Historial y estadísticas" describe
 * what tapping the tile does from this hub, same reasoning a nav label and
 * a screen title don't have to say the same thing. */
export const MORE_ITEMS = [
  { key: "habitos", href: "/habits", dictKey: "more.manageHabits", icon: ListChecks },
  { key: "historial", href: "/history", dictKey: "more.historyStats", icon: History },
  { key: "gym", href: "/gym", dictKey: "nav.gym", icon: Dumbbell },
  { key: "tareas", href: "/tasks", dictKey: "nav.tareas", icon: ListTodo },
  { key: "ajustes", href: "/settings", dictKey: "nav.ajustes", icon: Settings },
] as const;

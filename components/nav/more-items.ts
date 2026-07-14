import { Dumbbell, ListTodo, Settings } from "lucide-react";

/** Utilities grouped under the "Más" hub (see components/nav/nav-items.ts) —
 * add new ones here as they show up; the grid in app/(dashboard)/more
 * renders whatever's in this list, no other wiring needed. */
export const MORE_ITEMS = [
  { key: "gym", href: "/gym", dictKey: "nav.gym", icon: Dumbbell },
  { key: "tareas", href: "/tasks", dictKey: "nav.tareas", icon: ListTodo },
  { key: "ajustes", href: "/settings", dictKey: "nav.ajustes", icon: Settings },
] as const;

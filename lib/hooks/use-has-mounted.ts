import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/** true sólo después de la hidratación en cliente; evita mismatches de SSR sin usar un efecto. */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

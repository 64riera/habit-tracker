import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/** true only after client hydration; avoids SSR mismatches without using an effect. */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

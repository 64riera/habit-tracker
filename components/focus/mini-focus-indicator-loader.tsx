import { getFocusHeaderData } from "@/lib/queries/focus";
import { MiniFocusIndicator } from "./mini-focus-indicator";

/** Split from the layout so this can stream in behind its own <Suspense>
 * instead of blocking the whole shell — a `null` fallback (nothing shown
 * until ready) is visually identical to "no active session", which is
 * already this component's own empty state. */
export async function MiniFocusIndicatorLoader() {
  const { session, soundEnabled } = await getFocusHeaderData();
  return <MiniFocusIndicator session={session} soundEnabled={soundEnabled} />;
}

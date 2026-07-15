import { getDashboardShellCounts } from "@/lib/queries/dashboard-shell";
import { InstallSuggestionModal } from "./install-suggestion-modal";

/** Split from the layout so this can stream in behind its own <Suspense> —
 * the modal only ever opens once, right after the first habit, so a
 * moment's delay before it's offered is unnoticeable. */
export async function InstallSuggestionLoader() {
  const { habitCount, installPromptSeen } = await getDashboardShellCounts();
  const shouldOffer = habitCount === 1 && !installPromptSeen;
  return <InstallSuggestionModal shouldOffer={shouldOffer} />;
}

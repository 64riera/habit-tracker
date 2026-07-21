import dynamic from "next/dynamic";
import { getDashboardShellCounts } from "@/lib/queries/dashboard-shell";

// Dynamically imported (not a top-level static import): this mounts
// unconditionally on every dashboard page load, but the modal itself (full
// Radix Dialog) only ever opens once per account, right after the first
// habit — no reason to ship its JS in the main dashboard chunk for the
// 99% of loads that never open it. `ssr: false` isn't available here (this
// file is a Server Component, see InstallSuggestionLoader below) — the
// dynamic import alone is still what puts it in its own lazily-loaded chunk.
const InstallSuggestionModal = dynamic(() =>
  import("./install-suggestion-modal").then((m) => m.InstallSuggestionModal)
);

/** Split from the layout so this can stream in behind its own <Suspense> —
 * the modal only ever opens once, right after the first habit, so a
 * moment's delay before it's offered is unnoticeable. */
export async function InstallSuggestionLoader() {
  const { habitCount, installPromptSeen } = await getDashboardShellCounts();
  const shouldOffer = habitCount === 1 && !installPromptSeen;
  return <InstallSuggestionModal shouldOffer={shouldOffer} />;
}

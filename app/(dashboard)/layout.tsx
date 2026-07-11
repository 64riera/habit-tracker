import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { MiniFocusIndicator } from "@/components/focus/mini-focus-indicator";
import { TimezoneSync } from "@/components/pwa/timezone-sync";
import { InstallSuggestionModal } from "@/components/pwa/install-suggestion-modal";
import { getStreakMax } from "@/lib/streaks";
import { getFocusHeaderData } from "@/lib/queries/focus";
import { getHabitCount } from "@/lib/queries/habits";
import { getInstallPromptSeen, getTimezonePreference } from "@/lib/queries/user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [streakMax, focusHeader, timezone, habitCount, installPromptSeen] = await Promise.all([
    getStreakMax(),
    getFocusHeaderData(),
    getTimezonePreference(),
    getHabitCount(),
    getInstallPromptSeen(),
  ]);
  const shouldOfferInstall = habitCount === 1 && !installPromptSeen;

  return (
    // Shell fixed to the viewport (h-dvh + overflow-hidden): the header and
    // bottom nav stay structurally outside the scrolling area, instead of
    // relying on position:fixed/sticky over the document scroll, which is
    // unreliable on real mobile browsers. <main> is the only container with
    // internal scroll.
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <Sidebar streakMax={streakMax} />
      {/*
        overflow-anchor:none prevents the browser's "scroll anchoring"
        (enabled by default) from fighting with the sticky header that
        changes height when it docks at the top: without this, the browser
        tries to compensate for that size change by readjusting the scroll
        on the same frame, and with slow scrolling that compensation wins
        and the scroll resets in a loop visible as a glitch.
      */}
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 overflow-y-auto px-5 pb-6 [overflow-anchor:none] md:px-10 md:pb-9">
        {children}
      </main>
      <MiniFocusIndicator session={focusHeader.session} soundEnabled={focusHeader.soundEnabled} />
      <BottomNav />
      <TimezoneSync savedTimezone={timezone} />
      <InstallSuggestionModal shouldOffer={shouldOfferInstall} />
    </div>
  );
}

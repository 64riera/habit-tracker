import { Suspense } from "react";
import { SidebarWithStreak } from "@/components/nav/sidebar-with-streak";
import { BottomNav } from "@/components/nav/bottom-nav";
import { MiniFocusIndicatorLoader } from "@/components/focus/mini-focus-indicator-loader";
import { TimezoneSyncLoader } from "@/components/pwa/timezone-sync-loader";
import { InstallSuggestionLoader } from "@/components/pwa/install-suggestion-loader";
import { Sidebar } from "@/components/nav/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Shell pinned to the viewport itself (fixed inset-0), not just sized to
    // match it (h-dvh): the header and bottom nav stay structurally outside
    // the scrolling area, instead of relying on position:fixed/sticky over
    // the document scroll, which is unreliable on real mobile browsers.
    // `fixed` (rather than `h-dvh` alone) matters specifically offline —
    // some mobile browsers inject their own "no connection" chrome that
    // changes the visible viewport after paint, and a length computed from
    // `dvh` can lag that change enough for the shell to end up taller than
    // what's actually visible, leaking a real scrollbar onto the document
    // and pushing the bottom nav off-screen. <main> is the only
    // container with internal scroll.
    //
    // This component itself is intentionally synchronous (no top-level
    // await): BottomNav — the thing you actually tap to navigate — and
    // <main> (which streams its own page-level loading.tsx already) don't
    // depend on any of the shell's own data, so nothing here should make
    // them wait on it. Each piece that does need data (streak, focus
    // indicator, timezone sync, install prompt) is its own small async
    // component behind its own <Suspense>, same pattern as TodayHabits.
    <div className="fixed inset-0 flex flex-col overflow-hidden md:flex-row">
      <Suspense fallback={<Sidebar streakMax={null} />}>
        <SidebarWithStreak />
      </Suspense>
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
      <Suspense fallback={null}>
        <MiniFocusIndicatorLoader />
      </Suspense>
      <BottomNav />
      <Suspense fallback={null}>
        <TimezoneSyncLoader />
      </Suspense>
      <Suspense fallback={null}>
        <InstallSuggestionLoader />
      </Suspense>
    </div>
  );
}

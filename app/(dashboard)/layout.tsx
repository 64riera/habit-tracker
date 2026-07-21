import { Suspense } from "react";
import { SidebarWithStreak } from "@/components/nav/sidebar-with-streak";
import { BottomNav } from "@/components/nav/bottom-nav";
import { MiniFocusIndicatorLoader } from "@/components/focus/mini-focus-indicator-loader";
import { TimezoneSyncLoader } from "@/components/pwa/timezone-sync-loader";
import { InstallSuggestionLoader } from "@/components/pwa/install-suggestion-loader";
import { Sidebar } from "@/components/nav/sidebar";
import { SWRConfigProvider } from "@/components/swr/swr-provider";
import { RealtimeProvider } from "@/lib/realtime/client";
import { OfflineProvider } from "@/lib/offline/client";
import { getCurrentUserId } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SWR's IndexedDB cache, realtime push, and the offline mutation queue
  // only matter once there's an authenticated account with data to cache/
  // sync — scoped to this layout (every route under it requires a session,
  // see proxy.ts) instead of the root layout, so a logged-out visit to
  // /welcome, /login, or /signup doesn't pay for any of it. `getCurrentUserId`
  // (not the `OrNull` variant used at the root) since a session is
  // guaranteed here; it's `cache()`-wrapped (lib/auth/session.ts), so this
  // await doesn't add a real DB read on top of whatever else this same
  // request already resolved it for — BottomNav/<main> below still don't
  // wait on any *section* data, which is what the layout historically kept
  // synchronous for.
  const userId = await getCurrentUserId();

  return (
    <SWRConfigProvider userId={userId}>
      <RealtimeProvider userId={userId}>
        <OfflineProvider>
          {/*
            Shell pinned to the viewport itself (fixed inset-0), not just
            sized to match it (h-dvh): the header and bottom nav stay
            structurally outside the scrolling area, instead of relying on
            position:fixed/sticky over the document scroll, which is
            unreliable on real mobile browsers. `fixed` (rather than `h-dvh`
            alone) matters specifically offline — some mobile browsers
            inject their own "no connection" chrome that changes the
            visible viewport after paint, and a length computed from `dvh`
            can lag that change enough for the shell to end up taller than
            what's actually visible, leaking a real scrollbar onto the
            document and pushing the bottom nav off-screen. <main> is the
            only container with internal scroll.
          */}
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
        </OfflineProvider>
      </RealtimeProvider>
    </SWRConfigProvider>
  );
}

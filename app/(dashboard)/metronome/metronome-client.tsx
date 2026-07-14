"use client";

import { useMemo } from "react";
import { ContentHeader } from "@/components/nav/content-header";
import { MetronomePanel } from "@/components/metronome/metronome-panel";
import { TimerPanel } from "@/components/metronome/timer-panel";
import { useOffline } from "@/lib/offline/client";
import { pendingMetronomeTimer } from "@/lib/offline/pending-selectors";
import type { TimerRow } from "@/lib/metronome/timer-compute";

export function MetronomeClient({ initialTimer, initialBpm }: { initialTimer: TimerRow | null; initialBpm: number }) {
  const { pendingMutations } = useOffline();
  // `undefined` = no timer mutation queued, trust the real server prop. A
  // queued start (possibly followed by pause/resume/...) previews as a
  // "ghost" timer, same convention as Enfoque's pendingFocusSession, so the
  // timer is usable even before it ever syncs.
  const pendingTimer = useMemo(() => pendingMetronomeTimer(pendingMutations), [pendingMutations]);
  const effectiveTimer = pendingTimer !== undefined ? pendingTimer : initialTimer;

  return (
    <div>
      <ContentHeader titleKey="screens.metronome.title" subtitleKey="screens.metronome.subtitle" />
      <div className="flex flex-col gap-3">
        <MetronomePanel initialBpm={initialBpm} />
        <TimerPanel timer={effectiveTimer} pendingSync={pendingTimer !== undefined} />
      </div>
    </div>
  );
}

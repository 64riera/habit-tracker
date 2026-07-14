"use client";

import { ContentHeader } from "@/components/nav/content-header";
import { MetronomePanel } from "@/components/metronome/metronome-panel";
import { TimerPanel } from "@/components/metronome/timer-panel";
import type { TimerRow } from "@/lib/metronome/timer-compute";

export function MetronomeClient({ initialTimer, initialBpm }: { initialTimer: TimerRow | null; initialBpm: number }) {
  return (
    <div>
      <ContentHeader titleKey="screens.metronome.title" subtitleKey="screens.metronome.subtitle" />
      <div className="flex flex-col gap-3">
        <MetronomePanel initialBpm={initialBpm} />
        <TimerPanel initialTimer={initialTimer} />
      </div>
    </div>
  );
}

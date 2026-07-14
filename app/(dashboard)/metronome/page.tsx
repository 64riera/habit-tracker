import { getActiveTimer } from "@/lib/queries/metronome";
import { getMetronomeBpm } from "@/lib/queries/user";
import { MetronomeClient } from "./metronome-client";

export default async function MetronomoPage() {
  const [timer, bpm] = await Promise.all([getActiveTimer(), getMetronomeBpm()]);
  return <MetronomeClient initialTimer={timer} initialBpm={bpm} />;
}

import { getFocusRewardProgress } from "@/lib/queries/focus";
import { BosqueClient } from "./forest-client";

export default async function BosquePage() {
  const progress = await getFocusRewardProgress();
  return <BosqueClient progress={progress} />;
}

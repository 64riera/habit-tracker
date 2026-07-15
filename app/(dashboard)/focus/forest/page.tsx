import { getServerToday } from "@/lib/settings/date-server";
import { getFocusForestData } from "@/lib/queries/focus-forest";
import { BosqueClient } from "./forest-client";

export default async function BosquePage() {
  const today = await getServerToday();
  const data = await getFocusForestData(today);
  return <BosqueClient data={data} today={today} />;
}

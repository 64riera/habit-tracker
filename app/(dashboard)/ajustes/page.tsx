import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { getFocusHeaderData } from "@/lib/queries/focus";
import { AjustesClient } from "./ajustes-client";

export default async function AjustesPage() {
  const [cutoffHour, focusHeader] = await Promise.all([getDayCutoffHour(), getFocusHeaderData()]);
  return <AjustesClient cutoffHour={cutoffHour} focusHeader={focusHeader} />;
}

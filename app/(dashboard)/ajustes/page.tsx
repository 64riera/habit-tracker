import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { AjustesClient } from "./ajustes-client";

export default async function AjustesPage() {
  const cutoffHour = await getDayCutoffHour();
  return <AjustesClient cutoffHour={cutoffHour} />;
}

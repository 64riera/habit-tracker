import { getDayCutoffHour } from "@/lib/settings/day-cutoff";
import { getFocusHeaderData } from "@/lib/queries/focus";
import { getCurrencyPreference } from "@/lib/queries/user";
import { AjustesClient } from "./settings-client";

export default async function AjustesPage() {
  const [cutoffHour, focusHeader, currency] = await Promise.all([
    getDayCutoffHour(),
    getFocusHeaderData(),
    getCurrencyPreference(),
  ]);
  return <AjustesClient cutoffHour={cutoffHour} focusHeader={focusHeader} currency={currency} />;
}

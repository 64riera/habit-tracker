import { getDayCutoffHour } from "@/lib/settings/date-server";
import { getFocusHeaderData } from "@/lib/queries/focus";
import { getCurrencyPreference, getUserProfile } from "@/lib/queries/user";
import { AjustesClient } from "./settings-client";

export default async function AjustesPage() {
  const [cutoffHour, focusHeader, currency, profile] = await Promise.all([
    getDayCutoffHour(),
    getFocusHeaderData(),
    getCurrencyPreference(),
    getUserProfile(),
  ]);
  return <AjustesClient cutoffHour={cutoffHour} focusHeader={focusHeader} currency={currency} profile={profile} />;
}

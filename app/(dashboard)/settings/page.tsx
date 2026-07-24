import { getDayCutoffHour } from "@/lib/settings/date-server";
import { getFocusHeaderData } from "@/lib/queries/focus";
import { getCurrencyPreference, getDarkVariant, getLightVariant, getUserProfile } from "@/lib/queries/user";
import { AjustesClient } from "./settings-client";

export default async function AjustesPage() {
  const [cutoffHour, focusHeader, currency, darkVariant, lightVariant, profile] = await Promise.all([
    getDayCutoffHour(),
    getFocusHeaderData(),
    getCurrencyPreference(),
    getDarkVariant(),
    getLightVariant(),
    getUserProfile(),
  ]);
  return (
    <AjustesClient
      cutoffHour={cutoffHour}
      focusHeader={focusHeader}
      currency={currency}
      darkVariant={darkVariant}
      lightVariant={lightVariant}
      profile={profile}
    />
  );
}

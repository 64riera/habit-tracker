import { getTimezonePreference } from "@/lib/queries/user";
import { TimezoneSync } from "./timezone-sync";

/** Split from the layout so this can stream in behind its own <Suspense> —
 * TimezoneSync has no visual output, so a moment's delay is unnoticeable. */
export async function TimezoneSyncLoader() {
  const timezone = await getTimezonePreference();
  return <TimezoneSync savedTimezone={timezone} />;
}

import "server-only";
import { cookies } from "next/headers";
import { DAY_CUTOFF_COOKIE, DEFAULT_DAY_CUTOFF_HOUR } from "./day-cutoff-shared";

export { DEFAULT_DAY_CUTOFF_HOUR };

export async function getDayCutoffHour(): Promise<number> {
  const store = await cookies();
  const raw = store.get(DAY_CUTOFF_COOKIE)?.value;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 23 ? parsed : DEFAULT_DAY_CUTOFF_HOUR;
}

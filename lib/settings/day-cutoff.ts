import "server-only";
import { cookies } from "next/headers";

export const DEFAULT_DAY_CUTOFF_HOUR = 3;

export async function getDayCutoffHour(): Promise<number> {
  const store = await cookies();
  const raw = store.get("justgo_day_cutoff")?.value;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 23 ? parsed : DEFAULT_DAY_CUTOFF_HOUR;
}

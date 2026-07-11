export type TimeOfDayBucket = "morning" | "afternoon" | "evening" | "night";

const MORNING_START_HOUR = 5;
const AFTERNOON_START_HOUR = 12;
const EVENING_START_HOUR = 18;
const NIGHT_START_HOUR = 22;

/**
 * Time-of-day bucket for a local hour (0-23). The cutoffs are: night
 * [22-4], morning [5-11], afternoon [12-17], early evening/dusk [18-21] —
 * the same common-sense criteria used by weather/calendar apps.
 */
export function bucketHourOfDay(hour: number): TimeOfDayBucket {
  if (hour >= NIGHT_START_HOUR || hour < MORNING_START_HOUR) return "night";
  if (hour < AFTERNOON_START_HOUR) return "morning";
  if (hour < EVENING_START_HOUR) return "afternoon";
  return "evening";
}

export const TIME_OF_DAY_ORDER: TimeOfDayBucket[] = ["morning", "afternoon", "evening", "night"];

export type TimeOfDayBucket = "morning" | "afternoon" | "evening" | "night";

const MORNING_START_HOUR = 5;
const AFTERNOON_START_HOUR = 12;
const EVENING_START_HOUR = 18;
const NIGHT_START_HOUR = 22;

/**
 * Franja del día para una hora local (0-23). Los cortes son: noche [22-4],
 * mañana [5-11], tarde [12-17], noche temprana/atardecer [18-21] — mismo
 * criterio de sentido común que usan las apps de clima/calendario.
 */
export function bucketHourOfDay(hour: number): TimeOfDayBucket {
  if (hour >= NIGHT_START_HOUR || hour < MORNING_START_HOUR) return "night";
  if (hour < AFTERNOON_START_HOUR) return "morning";
  if (hour < EVENING_START_HOUR) return "afternoon";
  return "evening";
}

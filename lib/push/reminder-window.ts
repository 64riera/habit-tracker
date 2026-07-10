function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * ¿Ya pasó (o es) la hora de un recordatorio "HH:MM", dentro de la ventana de
 * tolerancia `windowMinutes` hacia atrás? La diferencia se calcula módulo
 * 1440 (minutos del día) para que un recordatorio a las 23:58 siga
 * detectándose aunque `now` ya haya cruzado la medianoche (00:05). Se usa en
 * app/api/cron/reminders/route.ts, que corre cada `windowMinutes` minutos:
 * un recordatorio "due" en una corrida no debe volver a disparar en la
 * siguiente, por eso la ventana mira solo hacia atrás, nunca hacia adelante.
 */
export function isReminderDue(reminderHHMM: string, nowHHMM: string, windowMinutes: number): boolean {
  const diff = (toMinutes(nowHHMM) - toMinutes(reminderHHMM) + 1440) % 1440;
  return diff >= 0 && diff < windowMinutes;
}

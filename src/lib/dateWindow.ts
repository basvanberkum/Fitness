/** Begin (lokale middernacht) van een venster van `days` kalenderdagen dat eindigt op de dag
 * van `now`, inclusief die dag zelf. Bij `days` = 7 en `now` = woensdag is dat dus de
 * donderdag van vorige week, 00:00 — de woensdag van vorige week valt er al buiten. */
export function startOfDayWindow(days: number, now: Date): Date {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - days + 1)
  return start
}

/** Of `dateIso` binnen de laatste `days` kalenderdagen valt (vandaag + `days` - 1 dagen terug),
 * en niet in de toekomst ligt. */
export function withinDays(dateIso: string, days: number, now: Date): boolean {
  const date = new Date(dateIso)
  return date >= startOfDayWindow(days, now) && date <= now
}

import type { Exercise } from '../data/exercises'
import type { LogEntry } from './storage'

const MINUTES_PER_HOUR = 60

/**
 * Het aantal (eventueel fractionele) "sets" dat deze log meetelt voor de spiergroep-score.
 * Voor krachtoefeningen is dit gewoon het aantal gelogde sets. Cardio-oefeningen zonder
 * spiergroep-belasting (de meeste) tellen sowieso nergens in mee, dus daarvoor maakt dit
 * niet uit. Voor een cardio-oefening die wél spiergroepen meetelt (bijv. skateboarden), is
 * er geen "set" in de gebruikelijke zin — de gelogde duur wordt dan uitgedrukt in uren, en
 * `exercise.muscles[spier]` geeft voor zo'n oefening het aantal equivalente hypertrofie-sets
 * per uur voor die spier (i.p.v. de 0-1-weging die bij krachtoefeningen gebruikt wordt).
 */
export function effectiveSetCount(entry: Pick<LogEntry, 'sets'>, exercise: Exercise): number {
  if (exercise.category !== 'cardio' || Object.keys(exercise.muscles).length === 0) {
    return entry.sets.length
  }
  const totalMinutes = entry.sets.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)
  return totalMinutes / MINUTES_PER_HOUR
}

import type { Exercise } from '../data/exercises'
import type { LogEntry } from './storage'

/** Hoeveel minuten continue cardio-inspanning ongeveer overeenkomt met 1 "set" voor de
 * spiergroep-score. Een eigen, niet-wetenschappelijke vuistregel — gebruikt alleen voor
 * cardio-oefeningen die ook spiergroepen meetellen (bijv. skateboarden voor benen/core),
 * om duur enigszins vergelijkbaar te maken met het "sets per week"-doel dat verder overal
 * voor krachtwerk geldt. */
const MINUTES_PER_EQUIVALENT_SET = 15

/**
 * Het aantal (eventueel fractionele) "sets" dat deze log meetelt voor de spiergroep-score.
 * Voor krachtoefeningen is dit gewoon het aantal gelogde sets. Cardio-oefeningen zonder
 * spiergroep-belasting (de meeste) tellen sowieso nergens in mee, dus daarvoor maakt dit
 * niet uit. Voor een cardio-oefening die wél spiergroepen meetelt, is er geen "set" in de
 * gebruikelijke zin — de gelogde duur wordt dan omgerekend naar een equivalent aantal sets.
 */
export function effectiveSetCount(entry: Pick<LogEntry, 'sets'>, exercise: Exercise): number {
  if (exercise.category !== 'cardio' || Object.keys(exercise.muscles).length === 0) {
    return entry.sets.length
  }
  const totalMinutes = entry.sets.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)
  return totalMinutes / MINUTES_PER_EQUIVALENT_SET
}

import { getEffectiveCardioTarget, type CardioTarget } from './cardioTargets'
import type { Exercise } from '../data/exercises'
import { getAllExercises } from './exerciseCatalog'
import type { LogEntry } from './storage'

export type CardioStatus = 'low' | 'good'

export interface CardioScore {
  label: string
  weeklyMinutes: number
  last30dWeeklyAverage: number
  target: CardioTarget
  weeklyStatus: CardioStatus
  last30dStatus: CardioStatus
}

function withinDays(dateIso: string, days: number, now: Date): boolean {
  const diffMs = now.getTime() - new Date(dateIso).getTime()
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000
}

/** Totaal minuten intensieve cardio (licht/wandelen telt hier niet in mee — daar houden we
 * geen doel voor bij) voor logs binnen de laatste `days` dagen. */
function intensiveMinutes(logs: LogEntry[], days: number, now: Date, exerciseById: Map<string, Exercise>): number {
  let total = 0
  for (const log of logs) {
    if (!withinDays(log.date, days, now)) continue
    const exercise = exerciseById.get(log.exerciseId)
    if (!exercise || exercise.category !== 'cardio') continue
    if ((exercise.cardioIntensity ?? 'intensive') !== 'intensive') continue
    total += log.sets.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)
  }
  return total
}

export function computeCardioScore(logs: LogEntry[], now: Date = new Date()): CardioScore {
  const exerciseById = new Map<string, Exercise>(getAllExercises().map((e) => [e.id, e]))
  const target = getEffectiveCardioTarget()
  const weeklyMinutes = Math.round(intensiveMinutes(logs, 7, now, exerciseById))
  const last30dWeeklyAverage = Math.round((intensiveMinutes(logs, 30, now, exerciseById) / (30 / 7)) * 10) / 10

  return {
    label: 'Intensieve cardio',
    weeklyMinutes,
    last30dWeeklyAverage,
    target,
    weeklyStatus: weeklyMinutes >= target.minutesPerWeek ? 'good' : 'low',
    last30dStatus: last30dWeeklyAverage >= target.minutesPerWeek ? 'good' : 'low',
  }
}

import { CARDIO_INTENSITY_LABELS, getEffectiveCardioTargets, type CardioTarget } from './cardioTargets'
import type { CardioIntensity, Exercise } from '../data/exercises'
import { getAllExercises } from './exerciseCatalog'
import type { LogEntry } from './storage'

export type CardioStatus = 'low' | 'good'

export interface CardioScore {
  intensity: CardioIntensity
  label: string
  weeklyMinutes: number
  last30dWeeklyAverage: number
  target: CardioTarget
  weeklyScore: number
  last30dScore: number
  weeklyStatus: CardioStatus
  last30dStatus: CardioStatus
}

function withinDays(dateIso: string, days: number, now: Date): boolean {
  const diffMs = now.getTime() - new Date(dateIso).getTime()
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000
}

/** Totaal cardio-minuten per intensiteitsniveau voor logs binnen de laatste `days` dagen. */
function minutesByIntensity(
  logs: LogEntry[],
  days: number,
  now: Date,
  exerciseById: Map<string, Exercise>,
): Record<CardioIntensity, number> {
  const totals: Record<CardioIntensity, number> = { intensive: 0, light: 0 }
  for (const log of logs) {
    if (!withinDays(log.date, days, now)) continue
    const exercise = exerciseById.get(log.exerciseId)
    if (!exercise || exercise.category !== 'cardio') continue
    const intensity = exercise.cardioIntensity ?? 'intensive'
    totals[intensity] += log.sets.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)
  }
  return totals
}

function scoreFor(minutes: number, target: CardioTarget): { score: number; status: CardioStatus } {
  const status: CardioStatus = minutes >= target.minutesPerWeek ? 'good' : 'low'
  const score = target.minutesPerWeek > 0 ? Math.min(100, Math.round((minutes / target.minutesPerWeek) * 100)) : 100
  return { score, status }
}

export function computeCardioScores(logs: LogEntry[], now: Date = new Date()): CardioScore[] {
  const exerciseById = new Map<string, Exercise>(getAllExercises().map((e) => [e.id, e]))
  const targets = getEffectiveCardioTargets()
  const weekly = minutesByIntensity(logs, 7, now, exerciseById)
  const last30d = minutesByIntensity(logs, 30, now, exerciseById)

  return (['intensive', 'light'] as CardioIntensity[]).map((intensity) => {
    const target = targets[intensity]
    const weeklyMinutes = Math.round(weekly[intensity])
    const last30dWeeklyAverage = Math.round((last30d[intensity] / (30 / 7)) * 10) / 10
    const weeklyResult = scoreFor(weeklyMinutes, target)
    const last30dResult = scoreFor(last30dWeeklyAverage, target)
    return {
      intensity,
      label: CARDIO_INTENSITY_LABELS[intensity],
      weeklyMinutes,
      last30dWeeklyAverage,
      target,
      weeklyScore: weeklyResult.score,
      last30dScore: last30dResult.score,
      weeklyStatus: weeklyResult.status,
      last30dStatus: last30dResult.status,
    }
  })
}

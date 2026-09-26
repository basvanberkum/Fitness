import { MUSCLE_LABELS, type Exercise, type MuscleGroup } from '../data/exercises'
import { getAllExercises } from './exerciseCatalog'
import type { LogEntry } from './storage'

export type MuscleStatus = 'low' | 'good' | 'high'

export interface MuscleTarget {
  min: number
  max: number
}

/**
 * Richtwaarden voor "harde sets" per spiergroep per week.
 * Dit is een algemene, veelgebruikte vuistregel uit krachttraining-coaching
 * (vaak aangeduid als ergens tussen ~10-20 sets per spiergroep per week voor
 * spiergroei bij recreatieve sporters). Dit is GEEN exact wetenschappelijk
 * vastgesteld getal voor jouw specifieke situatie — zie het als een
 * startpunt dat je zelf kan bijstellen, niet als medisch/sportwetenschappelijk
 * voorschrift.
 */
export const WEEKLY_SET_TARGETS: Record<MuscleGroup, MuscleTarget> = {
  chest: { min: 10, max: 20 },
  back: { min: 10, max: 20 },
  quads: { min: 10, max: 20 },
  shoulders: { min: 8, max: 16 },
  hamstrings: { min: 8, max: 16 },
  glutes: { min: 8, max: 16 },
  biceps: { min: 6, max: 14 },
  triceps: { min: 6, max: 14 },
  calves: { min: 6, max: 14 },
  core: { min: 6, max: 14 },
}

export interface MuscleScore {
  muscle: MuscleGroup
  label: string
  weeklySets: number
  last30dWeeklyAverage: number
  target: MuscleTarget
  weeklyScore: number
  last30dScore: number
  weeklyStatus: MuscleStatus
  last30dStatus: MuscleStatus
}

function withinDays(dateIso: string, days: number, now: Date): boolean {
  const date = new Date(dateIso)
  const diffMs = now.getTime() - date.getTime()
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000
}

/** Gewogen setcount per spiergroep voor logs binnen de laatste `days` dagen. */
function weightedSetsByMuscle(
  logs: LogEntry[],
  days: number,
  now: Date,
  exerciseById: Map<string, Exercise>,
): Record<MuscleGroup, number> {
  const totals = Object.fromEntries(
    (Object.keys(WEEKLY_SET_TARGETS) as MuscleGroup[]).map((m) => [m, 0]),
  ) as Record<MuscleGroup, number>

  for (const log of logs) {
    if (!withinDays(log.date, days, now)) continue
    const exercise = exerciseById.get(log.exerciseId)
    if (!exercise) continue
    const setCount = log.sets.length
    for (const [muscle, weight] of Object.entries(exercise.muscles) as [MuscleGroup, number][]) {
      totals[muscle] += setCount * weight
    }
  }

  return totals
}

function scoreFor(sets: number, target: MuscleTarget): { score: number; status: MuscleStatus } {
  if (sets < target.min) {
    return { score: Math.round((sets / target.min) * 100), status: 'low' }
  }
  if (sets <= target.max) {
    return { score: 100, status: 'good' }
  }
  return { score: 100, status: 'high' }
}

export function computeMuscleScores(logs: LogEntry[], now: Date = new Date()): MuscleScore[] {
  const exerciseById = new Map<string, Exercise>(getAllExercises().map((e) => [e.id, e]))
  const weekly = weightedSetsByMuscle(logs, 7, now, exerciseById)
  const last30d = weightedSetsByMuscle(logs, 30, now, exerciseById)

  return (Object.keys(WEEKLY_SET_TARGETS) as MuscleGroup[]).map((muscle) => {
    const target = WEEKLY_SET_TARGETS[muscle]
    const weeklySets = Math.round(weekly[muscle] * 10) / 10
    const last30dWeeklyAverage = Math.round((last30d[muscle] / (30 / 7)) * 10) / 10

    const weeklyResult = scoreFor(weeklySets, target)
    const last30dResult = scoreFor(last30dWeeklyAverage, target)

    return {
      muscle,
      label: MUSCLE_LABELS[muscle],
      weeklySets,
      last30dWeeklyAverage,
      target,
      weeklyScore: weeklyResult.score,
      last30dScore: last30dResult.score,
      weeklyStatus: weeklyResult.status,
      last30dStatus: last30dResult.status,
    }
  })
}

export function computeOverallScore(scores: MuscleScore[]): number {
  if (scores.length === 0) return 0
  const sum = scores.reduce((acc, s) => acc + s.weeklyScore, 0)
  return Math.round(sum / scores.length)
}

export interface ExerciseTip {
  muscle: MuscleGroup
  muscleLabel: string
  status: MuscleStatus
  suggestions: Exercise[]
  reason: string
}

function daysSinceLastPerformed(exerciseId: string, logs: LogEntry[], now: Date): number | null {
  let mostRecent: number | null = null
  for (const log of logs) {
    if (log.exerciseId !== exerciseId) continue
    const t = new Date(log.date).getTime()
    if (mostRecent === null || t > mostRecent) mostRecent = t
  }
  if (mostRecent === null) return null
  return Math.floor((now.getTime() - mostRecent) / (24 * 60 * 60 * 1000))
}

/**
 * Genereert tips: voor spiergroepen die deze week onder de richtwaarde zitten,
 * worden oefeningen voorgesteld die die spiergroep als primaire spier trainen,
 * met voorkeur voor oefeningen die je lang niet (of nog nooit) hebt gedaan.
 */
export function generateTips(logs: LogEntry[], now: Date = new Date(), maxTips = 4): ExerciseTip[] {
  const scores = computeMuscleScores(logs, now)
  const lowMuscles = scores
    .filter((s) => s.weeklyStatus === 'low')
    .sort((a, b) => a.weeklyScore - b.weeklyScore)
    .slice(0, maxTips)

  const allExercises = getAllExercises()

  return lowMuscles.map((score) => {
    const candidates = allExercises.filter((e) => (e.muscles[score.muscle] ?? 0) >= 0.8)

    const ranked = candidates
      .map((exercise) => ({
        exercise,
        daysSince: daysSinceLastPerformed(exercise.id, logs, now),
      }))
      .sort((a, b) => {
        // nooit gedaan (null) eerst, dan langst geleden gedaan eerst
        if (a.daysSince === null && b.daysSince === null) return 0
        if (a.daysSince === null) return -1
        if (b.daysSince === null) return 1
        return b.daysSince - a.daysSince
      })
      .slice(0, 3)
      .map((r) => r.exercise)

    const remainingSets = Math.max(0, Math.ceil(score.target.min - score.weeklySets))

    return {
      muscle: score.muscle,
      muscleLabel: score.label,
      status: score.weeklyStatus,
      suggestions: ranked,
      reason: `Deze week ${score.weeklySets} set${score.weeklySets === 1 ? '' : 's'} voor ${score.label.toLowerCase()}, richtwaarde is ${score.target.min}-${score.target.max}. Nog ongeveer ${remainingSets} set${remainingSets === 1 ? '' : 's'} te gaan.`,
    }
  })
}

import { MUSCLE_LABELS, type Exercise, type MuscleGroup } from '../data/exercises'
import { getAllExercises } from './exerciseCatalog'
import type { LogEntry } from './storage'
import { getEffectiveTargets, type MuscleTarget } from './targets'

export type MuscleStatus = 'low' | 'good' | 'high'
export type { MuscleTarget } from './targets'

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
    (Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((m) => [m, 0]),
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

/** Gewogen volume (reps × kg) per spiergroep voor logs binnen de laatste `days` dagen. */
function weightedVolumeByMuscle(
  logs: LogEntry[],
  days: number,
  now: Date,
  exerciseById: Map<string, Exercise>,
): Record<MuscleGroup, number> {
  const totals = Object.fromEntries(
    (Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((m) => [m, 0]),
  ) as Record<MuscleGroup, number>

  for (const log of logs) {
    if (!withinDays(log.date, days, now)) continue
    const exercise = exerciseById.get(log.exerciseId)
    if (!exercise) continue
    const volume = log.sets.reduce((sum, s) => sum + s.reps * s.weight, 0)
    for (const [muscle, weight] of Object.entries(exercise.muscles) as [MuscleGroup, number][]) {
      totals[muscle] += volume * weight
    }
  }

  return totals
}

/**
 * Score loopt lineair en continu op van 0 (geen sets) naar 100 (op of boven de
 * max-richtwaarde), zodat het enkel aanraken van de min niet al de volle 100
 * oplevert — alleen de max geeft het volledige puntenaantal. De status
 * (low/good/high) blijft wel gewoon bepaald door min/max, voor de kleurcodering.
 */
function scoreFor(sets: number, target: MuscleTarget): { score: number; status: MuscleStatus } {
  const status: MuscleStatus = sets < target.min ? 'low' : sets <= target.max ? 'good' : 'high'
  const score = target.max > 0 ? Math.min(100, Math.round((sets / target.max) * 100)) : 100
  return { score, status }
}

export function computeMuscleScores(logs: LogEntry[], now: Date = new Date()): MuscleScore[] {
  const exerciseById = new Map<string, Exercise>(getAllExercises().map((e) => [e.id, e]))
  const targets = getEffectiveTargets()
  const weekly = weightedSetsByMuscle(logs, 7, now, exerciseById)
  const last30d = weightedSetsByMuscle(logs, 30, now, exerciseById)

  return (Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((muscle) => {
    const target = targets[muscle]
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

export interface MuscleAverage {
  muscle: MuscleGroup
  label: string
  averagePerWeek: number
  totalSets: number
  totalVolume: number
  target: MuscleTarget
  score: number
  status: MuscleStatus
}

/**
 * Gemiddeld aantal sets per week per spiergroep, over een zelf te kiezen periode
 * (bijv. de laatste 90 dagen, of alle gelogde data), plus het totaal aantal sets
 * en totaal volume in die periode. Gebruikt voor de statistiekenpagina, waar de
 * periode instelbaar is i.p.v. vast op "deze week".
 */
export function computeMuscleWeeklyAverage(logs: LogEntry[], days: number, now: Date = new Date()): MuscleAverage[] {
  const exerciseById = new Map<string, Exercise>(getAllExercises().map((e) => [e.id, e]))
  const targets = getEffectiveTargets()
  const totals = weightedSetsByMuscle(logs, days, now, exerciseById)
  const volumes = weightedVolumeByMuscle(logs, days, now, exerciseById)
  const weeks = days / 7

  return (Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((muscle) => {
    const target = targets[muscle]
    const averagePerWeek = Math.round((totals[muscle] / weeks) * 10) / 10
    const result = scoreFor(averagePerWeek, target)
    return {
      muscle,
      label: MUSCLE_LABELS[muscle],
      averagePerWeek,
      totalSets: Math.round(totals[muscle] * 10) / 10,
      totalVolume: Math.round(volumes[muscle]),
      target,
      score: result.score,
      status: result.status,
    }
  })
}

export function computeOverallScore(scores: MuscleScore[]): number {
  if (scores.length === 0) return 0
  const sum = scores.reduce((acc, s) => acc + s.weeklyScore, 0)
  return Math.round(sum / scores.length)
}

export interface MuscleContribution {
  exerciseId: string
  exerciseName: string
  /** Gewicht van deze spiergroep in de oefening: 1 = primaire spier (direct), <1 = secundair (indirect). */
  weight: number
  totalSets: number
  /** totalSets × weight — de bijdrage die daadwerkelijk meetelt in de score. */
  weightedSets: number
  lastDate: string
}

/**
 * Onderbouwing van de score: welke oefeningen binnen de laatste `days` dagen sets hebben
 * bijgedragen aan deze spiergroep (direct of indirect via het gewicht in de
 * oefeningbibliotheek), gegroepeerd per oefening en gesorteerd op grootste bijdrage eerst.
 */
export function computeMuscleContributions(
  logs: LogEntry[],
  muscle: MuscleGroup,
  days: number,
  now: Date = new Date(),
): MuscleContribution[] {
  const exerciseById = new Map<string, Exercise>(getAllExercises().map((e) => [e.id, e]))
  const byExercise = new Map<string, { weight: number; totalSets: number; lastDate: string }>()

  for (const log of logs) {
    if (!withinDays(log.date, days, now)) continue
    const exercise = exerciseById.get(log.exerciseId)
    const weight = exercise?.muscles[muscle] ?? 0
    if (!exercise || weight <= 0) continue

    const existing = byExercise.get(log.exerciseId)
    if (existing) {
      existing.totalSets += log.sets.length
      if (new Date(log.date) > new Date(existing.lastDate)) existing.lastDate = log.date
    } else {
      byExercise.set(log.exerciseId, { weight, totalSets: log.sets.length, lastDate: log.date })
    }
  }

  return [...byExercise.entries()]
    .map(([exerciseId, v]) => ({
      exerciseId,
      exerciseName: exerciseById.get(exerciseId)?.name ?? exerciseId,
      weight: v.weight,
      totalSets: v.totalSets,
      weightedSets: Math.round(v.totalSets * v.weight * 10) / 10,
      lastDate: v.lastDate,
    }))
    .sort((a, b) => b.weightedSets - a.weightedSets)
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

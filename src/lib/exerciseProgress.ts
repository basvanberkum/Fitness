import { bucketKeyFor, labelFor, type Granularity } from './chartData'
import type { LogEntry } from './storage'

export type ProgressMetric = 'e1rm' | 'maxWeight' | 'volume'

export interface ProgressPoint {
  bucketKey: string
  dateLabel: string
  value: number
}

/**
 * Geschat 1-herhalingsmaximum via de Epley-formule (gewicht × (1 + reps/30)).
 * Dit is een veelgebruikte vuistregel-schatting, geen exacte meting — bij hoge
 * reps (>12) wordt de schatting minder betrouwbaar.
 */
export function estimatedOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return weight * (1 + reps / 30)
}

/** Voortgang van één oefening over tijd, voor een gekozen metric, gegroepeerd per dag/week/maand. */
export function buildExerciseProgressSeries(
  logs: LogEntry[],
  exerciseId: string,
  rangeDays: number,
  granularity: Granularity,
  metric: ProgressMetric,
  now: Date = new Date(),
): ProgressPoint[] {
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - rangeDays + 1)
  startDate.setHours(0, 0, 0, 0)

  const buckets = new Map<string, { dateLabel: string; values: number[] }>()

  for (const log of logs) {
    if (log.exerciseId !== exerciseId) continue
    const logDate = new Date(log.date)
    if (logDate < startDate || logDate > now) continue

    const key = bucketKeyFor(logDate, granularity)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { dateLabel: labelFor(logDate, granularity), values: [] }
      buckets.set(key, bucket)
    }

    if (metric === 'volume') {
      bucket.values.push(log.sets.reduce((sum, s) => sum + s.reps * s.weight, 0))
    } else if (metric === 'maxWeight') {
      bucket.values.push(Math.max(0, ...log.sets.map((s) => s.weight)))
    } else {
      bucket.values.push(Math.max(0, ...log.sets.map((s) => estimatedOneRepMax(s.weight, s.reps))))
    }
  }

  const points: ProgressPoint[] = [...buckets.entries()].map(([bucketKey, { dateLabel, values }]) => {
    const value = metric === 'volume' ? values.reduce((a, b) => a + b, 0) : Math.max(...values)
    return { bucketKey, dateLabel, value: Math.round(value * 10) / 10 }
  })

  return points.sort((a, b) => a.bucketKey.localeCompare(b.bucketKey))
}

export interface ExerciseLifetimeStats {
  totalSets: number
  totalSessions: number
  totalVolume: number
  maxWeight: number
  bestE1rm: number
  averageWeight: number
  firstPerformed: string | null
  lastPerformed: string | null
}

/** Statistieken over de hele historie van één oefening (al je gelogde data, niet periode-gebonden). */
export function computeExerciseLifetimeStats(logs: LogEntry[], exerciseId: string): ExerciseLifetimeStats {
  const relevant = logs.filter((l) => l.exerciseId === exerciseId)

  let totalSets = 0
  let totalVolume = 0
  let maxWeight = 0
  let bestE1rm = 0
  let weightSum = 0
  let weightedSetCount = 0
  let first: string | null = null
  let last: string | null = null

  for (const log of relevant) {
    if (!first || log.date < first) first = log.date
    if (!last || log.date > last) last = log.date
    for (const s of log.sets) {
      totalSets++
      totalVolume += s.reps * s.weight
      if (s.weight > maxWeight) maxWeight = s.weight
      const e1rm = estimatedOneRepMax(s.weight, s.reps)
      if (e1rm > bestE1rm) bestE1rm = e1rm
      if (s.weight > 0) {
        weightSum += s.weight
        weightedSetCount++
      }
    }
  }

  return {
    totalSets,
    totalSessions: relevant.length,
    totalVolume: Math.round(totalVolume),
    maxWeight: Math.round(maxWeight * 10) / 10,
    bestE1rm: Math.round(bestE1rm * 10) / 10,
    averageWeight: weightedSetCount > 0 ? Math.round((weightSum / weightedSetCount) * 10) / 10 : 0,
    firstPerformed: first,
    lastPerformed: last,
  }
}

export interface LastPerformed {
  date: string
  maxWeight: number
  totalSets: number
}

export function lastPerformedSummary(logs: LogEntry[], exerciseId: string): LastPerformed | null {
  let latest: LogEntry | null = null
  for (const log of logs) {
    if (log.exerciseId !== exerciseId) continue
    if (!latest || new Date(log.date).getTime() > new Date(latest.date).getTime()) latest = log
  }
  if (!latest) return null
  return {
    date: latest.date,
    maxWeight: Math.max(0, ...latest.sets.map((s) => s.weight)),
    totalSets: latest.sets.length,
  }
}

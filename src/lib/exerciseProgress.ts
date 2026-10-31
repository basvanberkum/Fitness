import { bucketKeyFor, labelFor, type Granularity } from './chartData'
import type { LogEntry, SetEntry } from './storage'

export type ProgressMetric = 'e1rm' | 'maxWeight' | 'volume' | 'cardioDuration' | 'cardioDistance'

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
    } else if (metric === 'cardioDuration') {
      bucket.values.push(log.sets.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0))
    } else if (metric === 'cardioDistance') {
      bucket.values.push(log.sets.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0))
    } else {
      bucket.values.push(Math.max(0, ...log.sets.map((s) => estimatedOneRepMax(s.weight, s.reps))))
    }
  }

  const isSumMetric = metric === 'volume' || metric === 'cardioDuration' || metric === 'cardioDistance'
  const points: ProgressPoint[] = [...buckets.entries()].map(([bucketKey, { dateLabel, values }]) => {
    const value = isSumMetric ? values.reduce((a, b) => a + b, 0) : Math.max(...values)
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
  totalDurationMinutes: number
  totalDistanceKm: number
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
  let totalDurationMinutes = 0
  let totalDistanceKm = 0
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
      totalDurationMinutes += s.durationMinutes ?? 0
      totalDistanceKm += s.distanceKm ?? 0
    }
  }

  return {
    totalSets,
    totalSessions: relevant.length,
    totalVolume: Math.round(totalVolume),
    maxWeight: Math.round(maxWeight * 10) / 10,
    bestE1rm: Math.round(bestE1rm * 10) / 10,
    averageWeight: weightedSetCount > 0 ? Math.round((weightSum / weightedSetCount) * 10) / 10 : 0,
    totalDurationMinutes: Math.round(totalDurationMinutes),
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    firstPerformed: first,
    lastPerformed: last,
  }
}

export interface LastPerformed {
  date: string
  maxWeight: number
  totalSets: number
  durationMinutes: number
  distanceKm: number
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
    durationMinutes: Math.round(latest.sets.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)),
    distanceKm: Math.round(latest.sets.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0) * 100) / 100,
  }
}

export interface ExerciseRecordEntry {
  date: string
  sets: SetEntry[]
}

export interface ExerciseRecords {
  /** De meest recente keer dat je deze oefening deed */
  last: ExerciseRecordEntry
  /** De sessie met het hoogste totale volume (reps × kg); bij gelijk volume (bijv. allemaal
   * eigen lichaamsgewicht zonder extra kg) telt het hoogste totaal aantal reps. */
  mostVolume: ExerciseRecordEntry & { volume: number; totalReps: number }
  /** De zwaarste losse set ooit; bij gelijk gewicht telt de set met de meeste reps. */
  heaviestSet: { date: string; set: SetEntry }
}

/**
 * Eerdere prestaties voor één krachtoefening, om tijdens het loggen te zien wat je moet
 * evenaren of verbeteren. `excludeLogId` sluit een log uit (bijv. de log die je nu bewerkt).
 */
export function computeExerciseRecords(
  logs: LogEntry[],
  exerciseId: string,
  excludeLogId?: string | null,
): ExerciseRecords | null {
  let last: LogEntry | null = null
  let mostVolume: ExerciseRecords['mostVolume'] | null = null
  let heaviestSet: ExerciseRecords['heaviestSet'] | null = null

  for (const log of logs) {
    if (log.exerciseId !== exerciseId || log.id === excludeLogId) continue
    const sets = log.sets.filter((s) => s.reps > 0)
    if (sets.length === 0) continue

    if (!last || new Date(log.date).getTime() > new Date(last.date).getTime()) last = log

    const volume = sets.reduce((sum, s) => sum + s.reps * s.weight, 0)
    const totalReps = sets.reduce((sum, s) => sum + s.reps, 0)
    if (
      !mostVolume ||
      volume > mostVolume.volume ||
      (volume === mostVolume.volume && totalReps > mostVolume.totalReps)
    ) {
      mostVolume = { date: log.date, sets, volume: Math.round(volume * 10) / 10, totalReps }
    }

    for (const s of sets) {
      if (
        !heaviestSet ||
        s.weight > heaviestSet.set.weight ||
        (s.weight === heaviestSet.set.weight && s.reps > heaviestSet.set.reps)
      ) {
        heaviestSet = { date: log.date, set: s }
      }
    }
  }

  if (!last || !mostVolume || !heaviestSet) return null
  return { last: { date: last.date, sets: last.sets.filter((s) => s.reps > 0) }, mostVolume, heaviestSet }
}

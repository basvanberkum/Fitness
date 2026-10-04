import type { ExerciseCategory } from '../data/exercises'
import { getAllExercises } from './exerciseCatalog'
import type { LogEntry } from './storage'

export type Granularity = 'day' | 'week' | 'month' | 'year'

export interface CategoryVolumePoint {
  bucketKey: string
  dateLabel: string
  push: number
  pull: number
  legs: number
  core: number
}

function startOfIsoWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dayIndex = (d.getDay() + 6) % 7 // maandag = 0
  d.setDate(d.getDate() - dayIndex)
  return d
}

export function bucketKeyFor(date: Date, granularity: Granularity): string {
  if (granularity === 'day') return date.toISOString().slice(0, 10)
  if (granularity === 'week') return startOfIsoWeek(date).toISOString().slice(0, 10)
  if (granularity === 'month') return date.toISOString().slice(0, 7)
  return String(date.getFullYear())
}

export function labelFor(date: Date, granularity: Granularity): string {
  if (granularity === 'day') return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  if (granularity === 'week') return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  if (granularity === 'month') return date.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' })
  return String(date.getFullYear())
}

/** Kiest een leesbare granulariteit op basis van de gekozen periode. */
export function granularityForRangeDays(days: number): Granularity {
  if (days <= 45) return 'day'
  if (days <= 180) return 'week'
  return 'month'
}

/** Aantal sets per categorie (push/pull/legs/core), gegroepeerd per dag/week/maand, over de gekozen periode. */
export function buildCategoryVolumeSeries(
  logs: LogEntry[],
  rangeDays: number,
  granularity: Granularity,
  now: Date = new Date(),
): CategoryVolumePoint[] {
  const exerciseCategoryById = new Map<string, ExerciseCategory>(getAllExercises().map((e) => [e.id, e.category]))
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - rangeDays + 1)
  startDate.setHours(0, 0, 0, 0)

  const buckets = new Map<string, CategoryVolumePoint>()

  const cursor = new Date(startDate)
  while (cursor <= now) {
    const key = bucketKeyFor(cursor, granularity)
    if (!buckets.has(key)) {
      buckets.set(key, { bucketKey: key, dateLabel: labelFor(cursor, granularity), push: 0, pull: 0, legs: 0, core: 0 })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const log of logs) {
    const logDate = new Date(log.date)
    if (logDate < startDate || logDate > now) continue
    const key = bucketKeyFor(logDate, granularity)
    const bucket = buckets.get(key)
    if (!bucket) continue
    const category = exerciseCategoryById.get(log.exerciseId)
    if (!category) continue
    bucket[category] += log.sets.length
  }

  return [...buckets.values()].sort((a, b) => a.bucketKey.localeCompare(b.bucketKey))
}

export type AggregateMetric = 'volume' | 'sets' | 'reps' | 'repsPerSet' | 'workouts' | 'duration'

export interface AggregateMetricPoint {
  bucketKey: string
  dateLabel: string
  value: number
}

interface BucketAccumulator {
  sets: number
  reps: number
  volume: number
  dayKeys: Set<string>
  /** Per trainingsdag het langst bekende sessieduur, om dubbeltelling te voorkomen
   * wanneer één trainingsdag meerdere oefening-rijen heeft die elk dezelfde
   * (bij import herhaalde) sessieduur dragen. */
  dayDurationMinutes: Map<string, number>
}

function emptyAccumulator(): BucketAccumulator {
  return { sets: 0, reps: 0, volume: 0, dayKeys: new Set(), dayDurationMinutes: new Map() }
}

/**
 * Bouwt een tijdreeks van één gekozen metriek (volume, sets, reps, etc.), gegroepeerd
 * per week/maand/jaar — onafhankelijk van de gekozen periode, zodat bijv. "Alles" +
 * "Jaar" gewoon één balk per jaar oplevert i.p.v. per maand.
 */
export function buildAggregateMetricSeries(
  logs: LogEntry[],
  rangeDays: number,
  granularity: Granularity,
  metric: AggregateMetric,
  now: Date = new Date(),
): AggregateMetricPoint[] {
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - rangeDays + 1)
  startDate.setHours(0, 0, 0, 0)

  const buckets = new Map<string, { dateLabel: string; acc: BucketAccumulator }>()

  const cursor = new Date(startDate)
  while (cursor <= now) {
    const key = bucketKeyFor(cursor, granularity)
    if (!buckets.has(key)) {
      buckets.set(key, { dateLabel: labelFor(cursor, granularity), acc: emptyAccumulator() })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const log of logs) {
    const logDate = new Date(log.date)
    if (logDate < startDate || logDate > now) continue
    const key = bucketKeyFor(logDate, granularity)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { dateLabel: labelFor(logDate, granularity), acc: emptyAccumulator() }
      buckets.set(key, bucket)
    }
    const { acc } = bucket
    const dayKey = logDate.toISOString().slice(0, 10)
    acc.sets += log.sets.length
    acc.reps += log.sets.reduce((sum, s) => sum + s.reps, 0)
    acc.volume += log.sets.reduce((sum, s) => sum + s.reps * s.weight, 0)
    acc.dayKeys.add(dayKey)
    if (log.durationMinutes) {
      const prev = acc.dayDurationMinutes.get(dayKey) ?? 0
      acc.dayDurationMinutes.set(dayKey, Math.max(prev, log.durationMinutes))
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bucketKey, { dateLabel, acc }]) => {
      let value: number
      switch (metric) {
        case 'volume':
          value = Math.round(acc.volume)
          break
        case 'sets':
          value = acc.sets
          break
        case 'reps':
          value = acc.reps
          break
        case 'repsPerSet':
          value = acc.sets > 0 ? Math.round((acc.reps / acc.sets) * 10) / 10 : 0
          break
        case 'workouts':
          value = acc.dayKeys.size
          break
        case 'duration':
          value = Math.round([...acc.dayDurationMinutes.values()].reduce((sum, m) => sum + m, 0))
          break
      }
      return { bucketKey, dateLabel, value }
    })
}

/** Aantal dagen tussen nu en de oudste log (minimaal 1), voor een "alles"-weergave. */
export function daysSinceEarliestLog(logs: LogEntry[], now: Date = new Date()): number {
  if (logs.length === 0) return 30
  const earliest = logs.reduce((min, l) => Math.min(min, new Date(l.date).getTime()), Infinity)
  return Math.max(1, Math.ceil((now.getTime() - earliest) / (24 * 60 * 60 * 1000)) + 1)
}

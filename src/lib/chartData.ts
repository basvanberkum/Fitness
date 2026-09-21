import { EXERCISES, type ExerciseCategory } from '../data/exercises'
import type { LogEntry } from './storage'

const exerciseCategoryById = new Map<string, ExerciseCategory>(EXERCISES.map((e) => [e.id, e.category]))

export interface DailyCategoryPoint {
  dateLabel: string
  isoDate: string
  push: number
  pull: number
  legs: number
  core: number
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Aantal sets per categorie (push/pull/legs/core), per dag, voor de laatste `days` dagen. */
export function buildDailyCategoryVolume(logs: LogEntry[], days: number, now: Date = new Date()): DailyCategoryPoint[] {
  const buckets = new Map<string, DailyCategoryPoint>()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = dayKey(d)
    buckets.set(key, {
      dateLabel: d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
      isoDate: key,
      push: 0,
      pull: 0,
      legs: 0,
      core: 0,
    })
  }

  for (const log of logs) {
    const key = dayKey(new Date(log.date))
    const bucket = buckets.get(key)
    if (!bucket) continue
    const category = exerciseCategoryById.get(log.exerciseId)
    if (!category) continue
    bucket[category] += log.sets.length
  }

  return [...buckets.values()]
}

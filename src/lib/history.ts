import type { LogEntry } from './storage'

export interface DayGroup {
  dateKey: string
  dateLabel: string
  entries: LogEntry[]
  totalSets: number
  workoutNames: string[]
}

function dayKey(dateIso: string): string {
  return new Date(dateIso).toISOString().slice(0, 10)
}

/** Groepeert logs per kalenderdag, meest recente dag eerst. Binnen een dag: meest recente eerst. */
export function groupLogsByDay(logs: LogEntry[]): DayGroup[] {
  const groups = new Map<string, LogEntry[]>()

  for (const log of logs) {
    const key = dayKey(log.date)
    const existing = groups.get(key)
    if (existing) existing.push(log)
    else groups.set(key, [log])
  }

  const result: DayGroup[] = [...groups.entries()].map(([dateKey, entries]) => {
    const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const workoutNames = [...new Set(sorted.map((e) => e.workoutName).filter((n): n is string => !!n))]
    const dateLabel = new Date(sorted[0].date).toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return {
      dateKey,
      dateLabel,
      entries: sorted,
      totalSets: sorted.reduce((sum, e) => sum + e.sets.length, 0),
      workoutNames,
    }
  })

  return result.sort((a, b) => b.dateKey.localeCompare(a.dateKey))
}

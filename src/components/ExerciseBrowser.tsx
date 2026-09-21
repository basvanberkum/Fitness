import { useMemo, useState } from 'react'
import {
  CATEGORY_LABELS,
  EXERCISES,
  MUSCLE_LABELS,
  type ExerciseCategory,
} from '../data/exercises'
import type { LogEntry } from '../lib/storage'

const CATEGORIES: (ExerciseCategory | 'all')[] = ['all', 'push', 'pull', 'legs', 'core']

function lastPerformed(exerciseId: string, logs: LogEntry[]): string | null {
  let mostRecent: number | null = null
  for (const log of logs) {
    if (log.exerciseId !== exerciseId) continue
    const t = new Date(log.date).getTime()
    if (mostRecent === null || t > mostRecent) mostRecent = t
  }
  if (mostRecent === null) return null
  return new Date(mostRecent).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export function ExerciseBrowser({ logs }: { logs: LogEntry[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return EXERCISES.filter((e) => {
      if (category !== 'all' && e.category !== category) return false
      if (q && !e.name.toLowerCase().includes(q) && !e.aliases.some((a) => a.includes(q))) return false
      return true
    })
  }, [query, category])

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Zoek een oefening..."
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
      />

      <div className="flex gap-2 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium"
            style={{
              background: category === cat ? 'var(--series-push)' : 'var(--surface-1)',
              color: category === cat ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {cat === 'all' ? 'Alle' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((exercise) => {
          const last = lastPerformed(exercise.id, logs)
          const muscleNames = Object.entries(exercise.muscles)
            .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
            .map(([m]) => MUSCLE_LABELS[m as keyof typeof MUSCLE_LABELS])
          return (
            <div
              key={exercise.id}
              className="rounded-xl p-3"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {exercise.name}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: 'var(--surface-page)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  {CATEGORY_LABELS[exercise.category]}
                </span>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {muscleNames.join(', ')}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                {last ? `Laatst gedaan: ${last}` : 'Nog niet gedaan'}
              </p>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Geen oefeningen gevonden.
          </p>
        )}
      </div>
    </div>
  )
}

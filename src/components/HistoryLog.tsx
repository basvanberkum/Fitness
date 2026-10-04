import { useMemo, useState } from 'react'
import { findExercise } from '../lib/exerciseCatalog'
import { groupLogsByDay } from '../lib/history'
import { deleteLog, type LogEntry } from '../lib/storage'

const PAGE_SIZE = 20

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function ExerciseEntryRow({ entry }: { entry: LogEntry }) {
  const exercise = findExercise(entry.exerciseId)
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--surface-page)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {exercise?.name ?? entry.exerciseId}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatTime(entry.date)}
            {entry.source === 'import' && ' · geïmporteerd'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => deleteLog(entry.id)}
          className="shrink-0 text-xs"
          style={{ color: 'var(--status-critical)' }}
          aria-label="Verwijderen"
        >
          Verwijderen
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {entry.sets.map((s, i) => (
          <li key={i} className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>
              Set {i + 1}: {s.reps} reps{s.weight ? ` × ${s.weight} kg` : ' (eigen gewicht)'}
            </span>
            {s.note && <span className="italic" style={{ color: 'var(--text-muted)' }}>{s.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HistoryLog({ logs }: { logs: LogEntry[] }) {
  const dayGroups = useMemo(() => groupLogsByDay(logs), [logs])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(dateKey: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }

  const visibleGroups = dayGroups.slice(0, visibleCount)

  return (
    <div className="flex flex-col gap-3 px-4 py-5">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Trainingsgeschiedenis
      </h1>

      {dayGroups.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Nog geen trainingen gelogd.
        </p>
      ) : (
        <>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {dayGroups.length} trainingsdagen in totaal
          </p>
          <div className="flex flex-col gap-2">
            {visibleGroups.map((group) => {
              const isOpen = expanded.has(group.dateKey)
              return (
                <div key={group.dateKey} className="rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => toggle(group.dateKey)}
                    className="flex w-full items-center justify-between gap-2 p-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                        {group.dateLabel}
                        {group.workoutNames.length > 0 && (
                          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                            {group.workoutNames.join(', ')}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {group.entries.length} oefening{group.entries.length === 1 ? '' : 'en'} · {group.totalSets} sets
                      </p>
                      {!isOpen && (
                        <p className="mt-1 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                          {group.entries
                            .map((e) => findExercise(e.exerciseId)?.name ?? e.exerciseId)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs" style={{ color: 'var(--series-push)' }}>
                      {isOpen ? 'Verbergen' : 'Bekijken'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="flex flex-col gap-2 border-t p-3" style={{ borderColor: 'var(--border)' }}>
                      {group.entries.map((entry) => (
                        <ExerciseEntryRow key={entry.id} entry={entry} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {visibleCount < dayGroups.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="mt-2 w-full rounded-lg py-2 text-sm font-medium"
              style={{ color: 'var(--series-push)', border: '1px solid var(--border)' }}
            >
              Meer laden ({dayGroups.length - visibleCount} dagen resterend)
            </button>
          )}
        </>
      )}
    </div>
  )
}

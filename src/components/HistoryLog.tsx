import { useMemo, useState } from 'react'
import { findExercise } from '../lib/exerciseCatalog'
import { groupLogsByDay, type DayGroup } from '../lib/history'
import { computeSessionQualityScore, qualityScoreColor } from '../lib/sessionQuality'
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

function SessionQualityBadge({ group, logs }: { group: DayGroup; logs: LogEntry[] }) {
  // Lazy: alleen berekend voor dagen die daadwerkelijk zichtbaar zijn gerenderd.
  const score = useMemo(() => computeSessionQualityScore(group, logs), [group, logs])
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: qualityScoreColor(score.overall), color: 'white' }}
      title="Inschatting van trainingskwaliteit (doelbijdrage, herstel, opbouw) — geen gevalideerd advies"
    >
      {score.overall.toFixed(1)}
    </span>
  )
}

function SessionQualityBreakdown({ group, logs }: { group: DayGroup; logs: LogEntry[] }) {
  const score = useMemo(() => computeSessionQualityScore(group, logs), [group, logs])
  return (
    <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--surface-page)', border: '1px solid var(--border)' }}>
      <p className="mb-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>
        Trainingskwaliteit: {score.overall.toFixed(1)} / 10
      </p>
      <ul className="flex flex-col gap-0.5" style={{ color: 'var(--text-secondary)' }}>
        <li>Doelbijdrage: {score.goalAlignment.toFixed(1)} / 10</li>
        <li>Herstel (~48u richtlijn): {score.recovery.toFixed(1)} / 10</li>
        <li>
          Opbouw/tempo: {score.structure.toFixed(1)} / 10
          {score.structureBasis === 'variety' && ' (schatting o.b.v. variatie, geen sessieduur bekend)'}
        </li>
      </ul>
      {score.notes.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-0.5 italic" style={{ color: 'var(--text-muted)' }}>
          {score.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      <p className="mt-1.5" style={{ color: 'var(--text-muted)' }}>
        Dit is een heuristische inschatting op basis van vuistregels, geen gevalideerd trainingsadvies.
      </p>
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

  const visibleGroups = useMemo(() => dayGroups.slice(0, visibleCount), [dayGroups, visibleCount])

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
                    <div className="min-w-0 flex-1">
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
                        {group.durationMinutes !== null && <> · {group.durationMinutes} min</>}
                      </p>
                      {!isOpen && (
                        <p className="mt-1 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                          {group.entries
                            .map((e) => findExercise(e.exerciseId)?.name ?? e.exerciseId)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SessionQualityBadge group={group} logs={logs} />
                      <span className="text-xs" style={{ color: 'var(--series-push)' }}>
                        {isOpen ? 'Verbergen' : 'Bekijken'}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="flex flex-col gap-2 border-t p-3" style={{ borderColor: 'var(--border)' }}>
                      <SessionQualityBreakdown group={group} logs={logs} />
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

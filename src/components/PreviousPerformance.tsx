import { useMemo } from 'react'
import { computeExerciseRecords } from '../lib/exerciseProgress'
import type { LogEntry, SetEntry } from '../lib/storage'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatSet(s: SetEntry): string {
  if (s.bodyweight) return s.weight > 0 ? `${s.reps} reps (eigen gewicht + ${s.weight}kg)` : `${s.reps} reps (eigen gewicht)`
  return s.weight > 0 ? `${s.reps} × ${s.weight}kg` : `${s.reps} reps`
}

/** Alle sets uitgeschreven, zodat ook pyramide-/dropsets precies te zien zijn. */
function formatSets(sets: SetEntry[]): string {
  const [first] = sets
  const uniform = sets.every((s) => s.reps === first.reps && s.weight === first.weight && !!s.bodyweight === !!first.bodyweight)
  if (uniform) return `${sets.length} ${sets.length === 1 ? 'set' : 'sets'} × ${formatSet(first)}`
  return sets.map(formatSet).join(', ')
}

/** Toont tijdens het loggen wat je eerder bij deze oefening deed: de vorige keer, je
 * sessie met het meeste volume en je zwaarste set — om te zien of je eroverheen kunt. */
export function PreviousPerformance({
  logs,
  exerciseId,
  excludeLogId,
}: {
  logs: LogEntry[]
  exerciseId: string
  excludeLogId?: string | null
}) {
  const records = useMemo(() => computeExerciseRecords(logs, exerciseId, excludeLogId), [logs, exerciseId, excludeLogId])

  if (!records) {
    return (
      <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        Nog geen eerdere sets van deze oefening.
      </p>
    )
  }

  const rows: { label: string; date: string; value: string }[] = [
    { label: 'Vorige keer', date: records.last.date, value: formatSets(records.last.sets) },
    {
      label: 'Meeste volume',
      date: records.mostVolume.date,
      value:
        formatSets(records.mostVolume.sets) +
        (records.mostVolume.volume > 0 ? ` = ${records.mostVolume.volume}kg totaal` : ` = ${records.mostVolume.totalReps} reps totaal`),
    },
    { label: 'Zwaarste set', date: records.heaviestSet.date, value: formatSet(records.heaviestSet.set) },
  ]

  return (
    <div
      className="mt-2 flex flex-col gap-1.5 rounded-lg p-2 text-xs"
      style={{ background: 'var(--surface-page)', border: '1px solid var(--border)' }}
    >
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between gap-2">
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              {r.label}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>{formatDate(r.date)}</span>
          </div>
          <div style={{ color: 'var(--text-primary)' }}>{r.value}</div>
        </div>
      ))}
    </div>
  )
}

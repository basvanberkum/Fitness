import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MUSCLE_LABELS, type Exercise, type MuscleGroup } from '../data/exercises'
import { granularityForRangeDays } from '../lib/chartData'
import { getChartPalette } from '../lib/chartColors'
import { deleteCustomExercise, isCustomExerciseId } from '../lib/exerciseCatalog'
import { buildExerciseProgressSeries, lastPerformedSummary, type ProgressMetric } from '../lib/exerciseProgress'
import type { LogEntry } from '../lib/storage'
import { useDarkMode } from '../lib/useDarkMode'

type RangeKey = '3m' | '6m' | '1j' | 'all'

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1j', label: '1J', days: 365 },
  { key: 'all', label: 'Alles', days: null },
]

const METRIC_OPTIONS: { key: ProgressMetric; label: string; unit: string }[] = [
  { key: 'e1rm', label: 'Geschat 1 herhalingsmax', unit: 'kg' },
  { key: 'maxWeight', label: 'Top gewicht per sessie', unit: 'kg' },
  { key: 'volume', label: 'Totaal volume (reps × kg)', unit: '' },
]

function daysSinceEarliestForExercise(logs: LogEntry[], exerciseId: string, now: Date): number {
  const relevant = logs.filter((l) => l.exerciseId === exerciseId)
  if (relevant.length === 0) return 90
  const earliest = relevant.reduce((min, l) => Math.min(min, new Date(l.date).getTime()), Infinity)
  return Math.max(1, Math.ceil((now.getTime() - earliest) / (24 * 60 * 60 * 1000)) + 1)
}

export function ExerciseDetail({
  exercise,
  logs,
  onBack,
  onDeleted,
}: {
  exercise: Exercise
  logs: LogEntry[]
  onBack: () => void
  onDeleted: () => void
}) {
  const isDark = useDarkMode()
  const palette = useMemo(() => getChartPalette(isDark), [isDark])
  const now = useMemo(() => new Date(), [])
  const [range, setRange] = useState<RangeKey>('6m')
  const [metric, setMetric] = useState<ProgressMetric>('e1rm')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const rangeDays = useMemo(() => {
    const opt = RANGE_OPTIONS.find((o) => o.key === range)
    return opt?.days ?? daysSinceEarliestForExercise(logs, exercise.id, now)
  }, [range, logs, exercise.id, now])

  const granularity = useMemo(() => granularityForRangeDays(rangeDays), [rangeDays])
  const points = useMemo(
    () => buildExerciseProgressSeries(logs, exercise.id, rangeDays, granularity, metric, now),
    [logs, exercise.id, rangeDays, granularity, metric, now],
  )
  const last = useMemo(() => lastPerformedSummary(logs, exercise.id), [logs, exercise.id])
  const metricInfo = METRIC_OPTIONS.find((m) => m.key === metric)!
  const xAxisInterval = Math.max(0, Math.ceil(points.length / 6) - 1)

  function handleDelete() {
    deleteCustomExercise(exercise.id)
    onDeleted()
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <button type="button" onClick={onBack} className="self-start text-sm" style={{ color: 'var(--series-push)' }}>
        ← Terug naar oefeningen
      </button>

      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {exercise.name}
        </h1>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {Object.keys(exercise.muscles)
            .map((m) => MUSCLE_LABELS[m as MuscleGroup])
            .join(', ')}
        </p>
        {last && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Laatst gedaan: {new Date(last.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
            {last.totalSets} sets · top {last.maxWeight}kg
          </p>
        )}
      </div>

      <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Grafiek
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as ProgressMetric)}
          className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          {METRIC_OPTIONS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setRange(opt.key)}
            className="flex-1 rounded-full py-1.5 text-xs font-medium"
            style={{
              background: range === opt.key ? 'var(--series-push)' : 'var(--surface-1)',
              color: range === opt.key ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        {points.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Geen data in deze periode.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={palette.gridline} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: palette.textMuted, fontSize: 11 }}
                  interval={xAxisInterval}
                  axisLine={{ stroke: palette.baseline }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: palette.textMuted, fontSize: 11 }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: palette.surface1,
                    border: `1px solid ${palette.gridline}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: palette.textSecondary }}
                  formatter={(value) => [`${value} ${metricInfo.unit}`, metricInfo.label]}
                />
                <Bar dataKey="value" fill={palette.seriesPush} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {metric === 'e1rm' && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Geschat 1RM is een vuistregel-schatting (Epley-formule), geen gemeten maximum — bij veel herhalingen per
          set is de schatting minder nauwkeurig.
        </p>
      )}

      {isCustomExerciseId(exercise.id) && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="w-full rounded-lg py-2 text-sm font-medium"
              style={{ color: 'var(--status-critical)', border: '1px solid var(--border)' }}
            >
              Verwijder deze eigen oefening
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 rounded-lg py-2 text-sm font-medium"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 rounded-lg py-2 text-sm font-medium text-white"
                style={{ background: 'var(--status-critical)' }}
              >
                Verwijderen
              </button>
            </div>
          )}
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Al gelogde trainingen met deze oefening blijven bewaard, maar tonen dan geen oefeningnaam meer.
          </p>
        </div>
      )}
    </div>
  )
}

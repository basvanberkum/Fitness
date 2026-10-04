import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { daysSinceEarliestLog } from '../lib/chartData'
import { getChartPalette, statusColorFromPalette } from '../lib/chartColors'
import { findExercise } from '../lib/exerciseCatalog'
import { computeMuscleWeeklyAverage } from '../lib/scoring'
import { useAllExercises } from '../lib/useAllExercises'
import { useDarkMode } from '../lib/useDarkMode'
import type { LogEntry } from '../lib/storage'
import { TargetSettings } from './TargetSettings'

function withinDays(dateIso: string, days: number, now: Date): boolean {
  const diff = now.getTime() - new Date(dateIso).getTime()
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000
}

type RangeKey = '7d' | '30d' | '90d' | 'all'

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'all', label: 'Alles' },
]

export function Stats({ logs }: { logs: LogEntry[] }) {
  const isDark = useDarkMode()
  const palette = useMemo(() => getChartPalette(isDark), [isDark])
  const now = useMemo(() => new Date(), [])
  const [range, setRange] = useState<RangeKey>('30d')
  const allExercises = useAllExercises()

  const rangeDays = useMemo(() => {
    if (range === '7d') return 7
    if (range === '30d') return 30
    if (range === '90d') return 90
    return daysSinceEarliestLog(logs, now)
  }, [range, logs, now])

  const rangeLabel = RANGE_OPTIONS.find((o) => o.key === range)?.label.toLowerCase()

  const muscleAverages = useMemo(() => {
    const data = computeMuscleWeeklyAverage(logs, rangeDays, now)
    // Hoogst scorend (best op schema) eerst.
    return [...data].sort((a, b) => b.score - a.score)
  }, [logs, rangeDays, now])

  const topExercises = useMemo(() => {
    const counts = new Map<string, number>()
    for (const log of logs) {
      if (!withinDays(log.date, rangeDays, now)) continue
      counts.set(log.exerciseId, (counts.get(log.exerciseId) ?? 0) + log.sets.length)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([exerciseId, sets]) => ({ exercise: findExercise(exerciseId), sets }))
  }, [logs, rangeDays, now])

  const tickStyle = { fill: palette.textMuted, fontSize: 11 }

  return (
    <div className="flex flex-col gap-6 px-4 py-5">
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

      <section
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Gemiddeld sets/week per spiergroep
        </h2>
        <p className="mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Gemiddelde over de laatste {rangeLabel} · getal achter de balk = gemiddelde / jouw doel per week
        </p>
        <div className="mb-2 flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: palette.statusCritical }} />
            Te weinig
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: palette.statusGood }} />
            Goed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: palette.statusSerious }} />
            Boven doel
          </span>
        </div>
        <div style={{ height: 360 }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={muscleAverages}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={palette.gridline} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={tickStyle} allowDecimals={false} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ ...tickStyle, fontSize: 11 }}
                axisLine={{ stroke: palette.baseline }}
                tickLine={false}
                width={82}
              />
              <Tooltip
                contentStyle={{
                  background: palette.surface1,
                  border: `1px solid ${palette.gridline}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: palette.textSecondary }}
                formatter={(value, _name, item) => [
                  `${value}/week (doel ${item.payload.target.min}-${item.payload.target.max}) · totaal ${item.payload.totalSets} sets, ${item.payload.totalVolume.toLocaleString('nl-NL')} kg volume`,
                  'Gemiddeld',
                ]}
              />
              <Bar dataKey="averagePerWeek" radius={[0, 4, 4, 0]}>
                {muscleAverages.map((m) => (
                  <Cell key={m.muscle} fill={statusColorFromPalette(palette, m.score)} />
                ))}
                <LabelList
                  dataKey="averagePerWeek"
                  position="right"
                  style={{ fill: palette.textSecondary, fontSize: 11 }}
                  formatter={(value: string | number | boolean | null | undefined) => `${value ?? ''}`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <table className="mt-3 w-full text-xs">
          <thead>
            <tr style={{ color: 'var(--text-muted)' }}>
              <th className="pb-1 text-left font-medium">Spiergroep</th>
              <th className="pb-1 text-right font-medium">Totaal sets</th>
              <th className="pb-1 text-right font-medium">Totaal volume</th>
            </tr>
          </thead>
          <tbody>
            {muscleAverages.map((m) => (
              <tr key={m.muscle} style={{ borderTop: `1px solid ${palette.gridline}` }}>
                <td className="py-1" style={{ color: 'var(--text-primary)' }}>
                  {m.label}
                </td>
                <td className="py-1 text-right" style={{ color: 'var(--text-secondary)' }}>
                  {m.totalSets}
                </td>
                <td className="py-1 text-right" style={{ color: 'var(--text-secondary)' }}>
                  {m.totalVolume.toLocaleString('nl-NL')} kg
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <TargetSettings />

      <section
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Meest gedane oefeningen ({rangeLabel})
        </h2>
        {topExercises.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nog geen data.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {topExercises.map(({ exercise, sets }) => (
              <li key={exercise?.id} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-primary)' }}>{exercise?.name}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{sets} sets</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        {allExercises.length} oefeningen beschikbaar in de bibliotheek
      </p>
    </div>
  )
}

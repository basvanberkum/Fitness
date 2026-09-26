import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CATEGORY_LABELS } from '../data/exercises'
import { buildCategoryVolumeSeries, daysSinceEarliestLog, granularityForRangeDays } from '../lib/chartData'
import { getChartPalette, statusColorFromPalette } from '../lib/chartColors'
import { findExercise } from '../lib/exerciseCatalog'
import { computeMuscleScores } from '../lib/scoring'
import { useAllExercises } from '../lib/useAllExercises'
import { useDarkMode } from '../lib/useDarkMode'
import type { LogEntry } from '../lib/storage'

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

  const granularity = useMemo(() => granularityForRangeDays(rangeDays), [rangeDays])
  const volumeData = useMemo(
    () => buildCategoryVolumeSeries(logs, rangeDays, granularity, now),
    [logs, rangeDays, granularity, now],
  )
  const scores = useMemo(() => computeMuscleScores(logs, now), [logs, now])

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
  // Toon ongeveer 6 labels op de x-as, ongeacht hoeveel datapunten er zijn.
  const xAxisInterval = Math.max(0, Math.ceil(volumeData.length / 6) - 1)

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
          Volume per categorie
        </h2>
        <p className="mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Aantal sets per {granularity === 'day' ? 'dag' : granularity === 'week' ? 'week' : 'maand'}, per type
          oefening
        </p>
        <div className="h-64 w-full" data-testid="category-line-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volumeData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={palette.gridline} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={tickStyle}
                interval={xAxisInterval}
                axisLine={{ stroke: palette.baseline }}
                tickLine={false}
              />
              <YAxis tick={tickStyle} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{
                  background: palette.surface1,
                  border: `1px solid ${palette.gridline}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: palette.textSecondary }}
              />
              <Legend
                verticalAlign="top"
                height={28}
                formatter={(value) => <span style={{ color: palette.textSecondary, fontSize: 12 }}>{value}</span>}
              />
              <Line type="monotone" dataKey="push" name={CATEGORY_LABELS.push} stroke={palette.seriesPush} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="pull" name={CATEGORY_LABELS.pull} stroke={palette.seriesPull} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="legs" name={CATEGORY_LABELS.legs} stroke={palette.seriesLegs} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="core" name={CATEGORY_LABELS.core} stroke={palette.seriesCore} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Sets per spiergroep (deze week)
        </h2>
        <div className="mb-2 flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: palette.statusCritical }} />
            Te weinig
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: palette.statusGood }} />
            Goed
          </span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scores} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={palette.gridline} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ ...tickStyle, fontSize: 10 }} axisLine={{ stroke: palette.baseline }} tickLine={false} />
              <YAxis tick={tickStyle} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{
                  background: palette.surface1,
                  border: `1px solid ${palette.gridline}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: palette.textSecondary }}
                formatter={(value) => [`${value} sets`, 'Deze week']}
              />
              <Bar dataKey="weeklySets" radius={[4, 4, 0, 0]}>
                {scores.map((s) => (
                  <Cell key={s.muscle} fill={statusColorFromPalette(palette, s.weeklyScore)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Meest gedane oefeningen ({RANGE_OPTIONS.find((o) => o.key === range)?.label.toLowerCase()})
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

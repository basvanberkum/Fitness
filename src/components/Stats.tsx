import { useMemo } from 'react'
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
import { CATEGORY_LABELS, EXERCISES, findExerciseById } from '../data/exercises'
import { buildDailyCategoryVolume } from '../lib/chartData'
import { getChartPalette, statusColorFromPalette } from '../lib/chartColors'
import { computeMuscleScores } from '../lib/scoring'
import { useDarkMode } from '../lib/useDarkMode'
import type { LogEntry } from '../lib/storage'

function withinDays(dateIso: string, days: number, now: Date): boolean {
  const diff = now.getTime() - new Date(dateIso).getTime()
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000
}

export function Stats({ logs }: { logs: LogEntry[] }) {
  const isDark = useDarkMode()
  const palette = useMemo(() => getChartPalette(isDark), [isDark])
  const now = useMemo(() => new Date(), [])

  const dailyData = useMemo(() => buildDailyCategoryVolume(logs, 30, now), [logs, now])
  const scores = useMemo(() => computeMuscleScores(logs, now), [logs, now])

  const topExercises = useMemo(() => {
    const counts = new Map<string, number>()
    for (const log of logs) {
      if (!withinDays(log.date, 30, now)) continue
      counts.set(log.exerciseId, (counts.get(log.exerciseId) ?? 0) + log.sets.length)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([exerciseId, sets]) => ({ exercise: findExerciseById(exerciseId), sets }))
  }, [logs, now])

  const tickStyle = { fill: palette.textMuted, fontSize: 11 }

  return (
    <div className="flex flex-col gap-6 px-4 py-5">
      <section
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Volume per categorie (30 dagen)
        </h2>
        <p className="mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Aantal sets per dag, per type oefening
        </p>
        <div className="h-64 w-full" data-testid="category-line-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={palette.gridline} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={tickStyle}
                interval={4}
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
          Meest gedane oefeningen (30 dagen)
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
        {EXERCISES.length} oefeningen beschikbaar in de bibliotheek
      </p>
    </div>
  )
}

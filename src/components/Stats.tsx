import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  buildAggregateMetricSeries,
  buildBodyWeightSeries,
  daysSinceEarliestLog,
  type AggregateMetric,
  type Granularity,
} from '../lib/chartData'
import { getChartPalette, statusColorForMuscleStatus } from '../lib/chartColors'
import { findExercise } from '../lib/exerciseCatalog'
import { computeMuscleWeeklyAverage } from '../lib/scoring'
import { useAllExercises } from '../lib/useAllExercises'
import { useDarkMode } from '../lib/useDarkMode'
import type { BodyWeightEntry, LogEntry } from '../lib/storage'
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

type TrendRangeKey = '3m' | '6m' | '1j' | 'all'

const TREND_RANGE_OPTIONS: { key: TrendRangeKey; label: string; days: number | null }[] = [
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1j', label: '1J', days: 365 },
  { key: 'all', label: 'Alles', days: null },
]

const TREND_GROUPBY_OPTIONS: { key: Granularity; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Maand' },
  { key: 'year', label: 'Jaar' },
]

type TrendMetric = AggregateMetric | 'bodyWeight'

const TREND_METRIC_OPTIONS: { key: TrendMetric; label: string; unit: string }[] = [
  { key: 'volume', label: 'Volume (reps × kg)', unit: 'kg' },
  { key: 'sets', label: 'Totaal sets', unit: '' },
  { key: 'reps', label: 'Totaal herhalingen', unit: '' },
  { key: 'repsPerSet', label: 'Herhalingen per set (gem.)', unit: '' },
  { key: 'workouts', label: 'Aantal trainingen', unit: '' },
  { key: 'duration', label: 'Duur training (totaal)', unit: 'min' },
  { key: 'bodyWeight', label: 'Lichaamsgewicht (gem.)', unit: 'kg' },
]

export function Stats({ logs, bodyWeightEntries }: { logs: LogEntry[]; bodyWeightEntries: BodyWeightEntry[] }) {
  const isDark = useDarkMode()
  const palette = useMemo(() => getChartPalette(isDark), [isDark])
  const now = useMemo(() => new Date(), [])
  const [range, setRange] = useState<RangeKey>('30d')
  const allExercises = useAllExercises()

  const [trendMetric, setTrendMetric] = useState<TrendMetric>('volume')
  const [trendGroupBy, setTrendGroupBy] = useState<Granularity>('month')
  const [trendRange, setTrendRange] = useState<TrendRangeKey>('6m')

  const rangeDays = useMemo(() => {
    if (range === '7d') return 7
    if (range === '30d') return 30
    if (range === '90d') return 90
    return daysSinceEarliestLog(logs, now)
  }, [range, logs, now])

  const rangeLabel = RANGE_OPTIONS.find((o) => o.key === range)?.label.toLowerCase()

  const trendRangeDays = useMemo(() => {
    const opt = TREND_RANGE_OPTIONS.find((o) => o.key === trendRange)
    return opt?.days ?? daysSinceEarliestLog(logs, now)
  }, [trendRange, logs, now])

  const trendPoints = useMemo(() => {
    if (trendMetric === 'bodyWeight') return buildBodyWeightSeries(bodyWeightEntries, trendRangeDays, trendGroupBy, now)
    return buildAggregateMetricSeries(logs, trendRangeDays, trendGroupBy, trendMetric, now)
  }, [logs, bodyWeightEntries, trendRangeDays, trendGroupBy, trendMetric, now])
  const trendMetricInfo = TREND_METRIC_OPTIONS.find((m) => m.key === trendMetric)!
  const trendXAxisInterval = Math.max(0, Math.ceil(trendPoints.length / 6) - 1)
  const trendHasAnyValue = trendPoints.some((p) => p.value !== null)

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
      <section
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <h2 className="mb-3 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Trend over tijd
        </h2>

        <div className="flex gap-2">
          <label className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Grafiek
            <select
              value={trendMetric}
              onChange={(e) => setTrendMetric(e.target.value as AggregateMetric)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {TREND_METRIC_OPTIONS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Groeperen op
            <select
              value={trendGroupBy}
              onChange={(e) => setTrendGroupBy(e.target.value as Granularity)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {TREND_GROUPBY_OPTIONS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex gap-2">
          {TREND_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTrendRange(opt.key)}
              className="flex-1 rounded-full py-1.5 text-xs font-medium"
              style={{
                background: trendRange === opt.key ? 'var(--series-push)' : 'var(--surface-page)',
                color: trendRange === opt.key ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-3" style={{ height: 240 }}>
          {trendPoints.length === 0 || (trendMetric === 'bodyWeight' && !trendHasAnyValue) ? (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Geen data in deze periode.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {trendMetric === 'bodyWeight' ? (
                <LineChart data={trendPoints} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={palette.gridline} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fill: palette.textMuted, fontSize: 11 }}
                    interval={trendXAxisInterval}
                    axisLine={{ stroke: palette.baseline }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: palette.textMuted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: palette.surface1,
                      border: `1px solid ${palette.gridline}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: palette.textSecondary }}
                    formatter={(value) => [value == null ? 'geen meting' : `${value} ${trendMetricInfo.unit}`, trendMetricInfo.label]}
                  />
                  <Line type="monotone" dataKey="value" stroke={palette.seriesPush} strokeWidth={2} connectNulls dot={{ r: 3 }} />
                </LineChart>
              ) : (
                <BarChart data={trendPoints} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={palette.gridline} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fill: palette.textMuted, fontSize: 11 }}
                    interval={trendXAxisInterval}
                    axisLine={{ stroke: palette.baseline }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: palette.textMuted, fontSize: 11 }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: palette.surface1,
                      border: `1px solid ${palette.gridline}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: palette.textSecondary }}
                    formatter={(value) => [`${value}${trendMetricInfo.unit ? ` ${trendMetricInfo.unit}` : ''}`, trendMetricInfo.label]}
                  />
                  <Bar dataKey="value" fill={palette.seriesPush} radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {trendMetric === 'duration' && (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Duur training is alleen bekend voor sessies waarvan een eindtijd is gelogd of geïmporteerd (CSV-kolom
            "Einde training") — oudere of handmatig ingevoerde trainingen zonder eindtijd tellen hier als 0 minuten.
          </p>
        )}
        {trendMetric === 'bodyWeight' && (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Gebaseerd op de lichaamsgewicht-kolom uit je CSV-import, die vaak niet bij elke training is ingevuld.
            Periodes zonder meting worden overgeslagen; de lijn verbindt de bekende metingen, ook over een gat
            zonder data heen.
          </p>
        )}
      </section>

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
                  <Cell key={m.muscle} fill={statusColorForMuscleStatus(palette, m.status)} />
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

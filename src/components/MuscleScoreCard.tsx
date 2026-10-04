import { useMemo, useState } from 'react'
import { computeMuscleContributions, type MuscleScore } from '../lib/scoring'
import { STATUS_META, statusColorForScore } from '../lib/statusMeta'
import type { LogEntry } from '../lib/storage'
import { ProgressBar } from './ProgressBar'

export function MuscleScoreCard({ score, logs, now }: { score: MuscleScore; logs: LogEntry[]; now: Date }) {
  const [expanded, setExpanded] = useState(false)
  const meta = STATUS_META[score.weeklyStatus]
  const barMax = Math.max(score.target.max, score.weeklySets)

  const contributions = useMemo(
    () => (expanded ? computeMuscleContributions(logs, score.muscle, 7, now) : []),
    [expanded, logs, score.muscle, now],
  )
  const contributionSum = useMemo(
    () => Math.round(contributions.reduce((sum, c) => sum + c.weightedSets, 0) * 10) / 10,
    [contributions],
  )

  return (
    <button
      type="button"
      onClick={() => setExpanded((e) => !e)}
      className="w-full rounded-xl p-4 text-left"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {score.label}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ background: meta.color, color: '#fff' }}
        >
          {meta.label}
        </span>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <span style={{ color: 'var(--text-secondary)' }}>Deze week</span>
          <span style={{ color: 'var(--text-primary)' }}>
            {score.weeklySets} <span style={{ color: 'var(--text-muted)' }}>/ {score.target.min}-{score.target.max} sets</span>
          </span>
        </div>
        <ProgressBar
          value={score.weeklySets}
          max={barMax}
          color={statusColorForScore(score.weeklyScore)}
          markerAt={score.target.min}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span style={{ color: 'var(--text-secondary)' }}>Laatste 30 dagen (gem./week)</span>
        <span style={{ color: 'var(--text-primary)' }}>{score.last30dWeeklyAverage}</span>
      </div>

      <p className="mt-2 text-xs" style={{ color: 'var(--series-push)' }}>
        {expanded ? '▴ Verberg onderbouwing' : '▾ Onderbouwing van deze week tonen'}
      </p>

      {expanded && (
        <div className="mt-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          {contributions.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Geen oefeningen voor {score.label.toLowerCase()} gevonden in de laatste 7 dagen.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {contributions.map((c) => (
                <li key={c.exerciseId} className="flex items-baseline justify-between gap-2 text-xs">
                  <span style={{ color: 'var(--text-primary)' }}>
                    {c.exerciseName}{' '}
                    <span style={{ color: 'var(--text-muted)' }}>
                      ({c.weight >= 1 ? 'direct' : `indirect ×${c.weight}`})
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {c.totalSets} sets → {c.weightedSets}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Som van bijdragen: {contributionSum} ≈ {score.weeklySets} sets deze week (klein verschil mogelijk door
            afronding).
          </p>
        </div>
      )}
    </button>
  )
}

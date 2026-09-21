import type { MuscleScore } from '../lib/scoring'
import { STATUS_META, statusColorForScore } from '../lib/statusMeta'
import { ProgressBar } from './ProgressBar'

export function MuscleScoreCard({ score }: { score: MuscleScore }) {
  const meta = STATUS_META[score.weeklyStatus]
  const barMax = Math.max(score.target.max, score.weeklySets)

  return (
    <div
      className="rounded-xl p-4"
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
    </div>
  )
}

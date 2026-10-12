import type { CardioScore } from '../lib/cardioScoring'
import { ProgressBar } from './ProgressBar'

export function CardioScoreCard({ score }: { score: CardioScore }) {
  const color = score.weeklyStatus === 'good' ? 'var(--status-good)' : 'var(--status-critical)'
  const barMax = Math.max(score.target.minutesPerWeek, score.weeklyMinutes)

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {score.label}
        </span>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: color, color: '#fff' }}>
          {score.weeklyStatus === 'good' ? 'Gehaald' : 'Nog niet gehaald'}
        </span>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <span style={{ color: 'var(--text-secondary)' }}>Deze week</span>
          <span style={{ color: 'var(--text-primary)' }}>
            {score.weeklyMinutes} <span style={{ color: 'var(--text-muted)' }}>/ {score.target.minutesPerWeek} min</span>
          </span>
        </div>
        <ProgressBar value={score.weeklyMinutes} max={barMax} color={color} markerAt={score.target.minutesPerWeek} />
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span style={{ color: 'var(--text-secondary)' }}>Laatste 30 dagen (gem./week)</span>
        <span style={{ color: 'var(--text-primary)' }}>{score.last30dWeeklyAverage} min</span>
      </div>
    </div>
  )
}

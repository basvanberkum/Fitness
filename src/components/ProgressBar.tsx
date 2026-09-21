interface ProgressBarProps {
  value: number
  max: number
  color: string
  markerAt?: number
}

export function ProgressBar({ value, max, color, markerAt }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const markerPct = markerAt !== undefined ? Math.max(0, Math.min(100, (markerAt / max) * 100)) : null

  return (
    <div className="relative h-2 w-full rounded-full" style={{ background: 'var(--gridline)' }}>
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
      {markerPct !== null && (
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2"
          style={{ left: `${markerPct}%`, background: 'var(--baseline)' }}
          title="Ondergrens richtwaarde"
        />
      )}
    </div>
  )
}

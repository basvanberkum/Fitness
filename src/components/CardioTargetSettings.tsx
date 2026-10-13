import { useState } from 'react'
import { DEFAULT_CARDIO_TARGET, hasCustomCardioTarget, resetCardioTarget, setCardioTarget } from '../lib/cardioTargets'
import { useCardioTarget } from '../lib/useCardioTarget'

const SLIDER_MAX = 240

export function CardioTargetSettings() {
  const [open, setOpen] = useState(false)
  const target = useCardioTarget()
  const custom = hasCustomCardioTarget()

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Eigen cardio-doel
        </span>
        <span className="text-xs" style={{ color: 'var(--accent)' }}>
          {open ? 'Verbergen' : 'Aanpassen'}
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-4">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Stel je eigen minimum aantal minuten per week intensieve cardio in (hardlopen, fietsen, zwemmen,
            skateboarden, ...). Wandelen/lichte cardio heeft bewust geen eigen doel.
          </p>
          <div className="rounded-lg p-3" style={{ background: 'var(--surface-page)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Intensief
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {target.minutesPerWeek} min/week
              </span>
            </div>

            <label className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Doel
              <input
                type="range"
                min={0}
                max={SLIDER_MAX}
                step={5}
                value={target.minutesPerWeek}
                onChange={(e) => setCardioTarget({ minutesPerWeek: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="w-10 text-right" style={{ color: 'var(--text-primary)' }}>
                {target.minutesPerWeek}
              </span>
            </label>

            {custom && (
              <button
                type="button"
                onClick={resetCardioTarget}
                className="mt-1 text-xs underline"
                style={{ color: 'var(--text-muted)' }}
              >
                Terug naar standaard ({DEFAULT_CARDIO_TARGET.minutesPerWeek} min/week)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

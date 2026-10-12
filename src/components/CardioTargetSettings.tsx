import { useState } from 'react'
import type { CardioIntensity } from '../data/exercises'
import {
  CARDIO_INTENSITY_LABELS,
  DEFAULT_CARDIO_TARGETS,
  hasCustomCardioTarget,
  resetAllCardioTargets,
  resetCardioTarget,
  setCardioTarget,
} from '../lib/cardioTargets'
import { useCardioTargets } from '../lib/useCardioTargets'

const INTENSITIES: CardioIntensity[] = ['intensive', 'light']
const SLIDER_MAX = 240

export function CardioTargetSettings() {
  const [open, setOpen] = useState(false)
  const targets = useCardioTargets()

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Eigen cardio-doelen
        </span>
        <span className="text-xs" style={{ color: 'var(--accent)' }}>
          {open ? 'Verbergen' : 'Aanpassen'}
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-4">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Stel je eigen minimum aantal minuten per week in, los voor intensieve cardio (hardlopen, fietsen,
            zwemmen, skateboarden, ...) en wandelen.
          </p>
          {INTENSITIES.map((intensity) => {
            const target = targets[intensity]
            const custom = hasCustomCardioTarget(intensity)
            const def = DEFAULT_CARDIO_TARGETS[intensity]
            return (
              <div key={intensity} className="rounded-lg p-3" style={{ background: 'var(--surface-page)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {CARDIO_INTENSITY_LABELS[intensity]}
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
                    onChange={(e) => setCardioTarget(intensity, { minutesPerWeek: Number(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="w-10 text-right" style={{ color: 'var(--text-primary)' }}>
                    {target.minutesPerWeek}
                  </span>
                </label>

                {custom && (
                  <button
                    type="button"
                    onClick={() => resetCardioTarget(intensity)}
                    className="mt-1 text-xs underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Terug naar standaard ({def.minutesPerWeek} min/week)
                  </button>
                )}
              </div>
            )
          })}

          <button
            type="button"
            onClick={resetAllCardioTargets}
            className="w-full rounded-lg py-2 text-sm font-medium"
            style={{ color: 'var(--status-critical)', border: '1px solid var(--border)' }}
          >
            Cardio-doelen terugzetten naar standaard
          </button>
        </div>
      )}
    </div>
  )
}

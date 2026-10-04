import { useState } from 'react'
import { MUSCLE_LABELS, type MuscleGroup } from '../data/exercises'
import { DEFAULT_WEEKLY_SET_TARGETS, hasCustomTarget, resetAllTargets, resetMuscleTarget, setMuscleTarget } from '../lib/targets'
import { useTargets } from '../lib/useTargets'

const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[]
const SLIDER_MAX = 30

export function TargetSettings() {
  const [open, setOpen] = useState(false)
  const targets = useTargets()

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Eigen doelen per spiergroep
        </span>
        <span className="text-xs" style={{ color: 'var(--series-push)' }}>
          {open ? 'Verbergen' : 'Aanpassen'}
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-4">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Stel per spiergroep je eigen streefrange sets/week in — bijv. hoger voor een spiergroep waar je nu op
            focust. Dit past meteen de score en grafieken overal in de app aan.
          </p>
          {MUSCLES.map((muscle) => {
            const target = targets[muscle]
            const custom = hasCustomTarget(muscle)
            const def = DEFAULT_WEEKLY_SET_TARGETS[muscle]
            return (
              <div key={muscle} className="rounded-lg p-3" style={{ background: 'var(--surface-page)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {MUSCLE_LABELS[muscle]}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {target.min}-{target.max} sets/week
                  </span>
                </div>

                <label className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Min
                  <input
                    type="range"
                    min={0}
                    max={SLIDER_MAX}
                    value={target.min}
                    onChange={(e) => {
                      const min = Number(e.target.value)
                      setMuscleTarget(muscle, { min, max: Math.max(min, target.max) })
                    }}
                    className="flex-1"
                  />
                  <span className="w-6 text-right" style={{ color: 'var(--text-primary)' }}>
                    {target.min}
                  </span>
                </label>
                <label className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Max
                  <input
                    type="range"
                    min={0}
                    max={SLIDER_MAX}
                    value={target.max}
                    onChange={(e) => {
                      const max = Number(e.target.value)
                      setMuscleTarget(muscle, { min: Math.min(target.min, max), max })
                    }}
                    className="flex-1"
                  />
                  <span className="w-6 text-right" style={{ color: 'var(--text-primary)' }}>
                    {target.max}
                  </span>
                </label>

                {custom && (
                  <button
                    type="button"
                    onClick={() => resetMuscleTarget(muscle)}
                    className="mt-1 text-xs underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Terug naar standaard ({def.min}-{def.max})
                  </button>
                )}
              </div>
            )
          })}

          <button
            type="button"
            onClick={resetAllTargets}
            className="w-full rounded-lg py-2 text-sm font-medium"
            style={{ color: 'var(--status-critical)', border: '1px solid var(--border)' }}
          >
            Alle doelen terugzetten naar standaard
          </button>
        </div>
      )}
    </div>
  )
}

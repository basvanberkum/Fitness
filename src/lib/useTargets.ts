import { useCallback, useEffect, useState } from 'react'
import type { MuscleGroup } from '../data/exercises'
import { getEffectiveTargets, TARGETS_CHANGED_EVENT, type MuscleTarget } from './targets'

export function useTargets(): Record<MuscleGroup, MuscleTarget> {
  const [targets, setTargets] = useState(() => getEffectiveTargets())

  const refresh = useCallback(() => setTargets(getEffectiveTargets()), [])

  useEffect(() => {
    window.addEventListener(TARGETS_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(TARGETS_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  return targets
}

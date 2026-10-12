import { useCallback, useEffect, useState } from 'react'
import type { CardioIntensity } from '../data/exercises'
import { CARDIO_TARGETS_CHANGED_EVENT, getEffectiveCardioTargets, type CardioTarget } from './cardioTargets'

export function useCardioTargets(): Record<CardioIntensity, CardioTarget> {
  const [targets, setTargets] = useState(() => getEffectiveCardioTargets())

  const refresh = useCallback(() => setTargets(getEffectiveCardioTargets()), [])

  useEffect(() => {
    window.addEventListener(CARDIO_TARGETS_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CARDIO_TARGETS_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  return targets
}

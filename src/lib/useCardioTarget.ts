import { useCallback, useEffect, useState } from 'react'
import { CARDIO_TARGETS_CHANGED_EVENT, getEffectiveCardioTarget, type CardioTarget } from './cardioTargets'

export function useCardioTarget(): CardioTarget {
  const [target, setTarget] = useState(() => getEffectiveCardioTarget())

  const refresh = useCallback(() => setTarget(getEffectiveCardioTarget()), [])

  useEffect(() => {
    window.addEventListener(CARDIO_TARGETS_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CARDIO_TARGETS_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  return target
}

import { useCallback, useEffect, useState } from 'react'
import { getBodyWeightEntries, type BodyWeightEntry } from './storage'

export function useBodyWeightEntries(): BodyWeightEntry[] {
  const [entries, setEntries] = useState<BodyWeightEntry[]>(() => getBodyWeightEntries())

  const refresh = useCallback(() => setEntries(getBodyWeightEntries()), [])

  useEffect(() => {
    window.addEventListener('fitness-tracker:bodyweight-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('fitness-tracker:bodyweight-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  return entries
}

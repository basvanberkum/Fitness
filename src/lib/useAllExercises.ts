import { useCallback, useEffect, useState } from 'react'
import type { Exercise } from '../data/exercises'
import { CUSTOM_EXERCISES_EVENT, getAllExercises } from './exerciseCatalog'

export function useAllExercises(): Exercise[] {
  const [exercises, setExercises] = useState<Exercise[]>(() => getAllExercises())

  const refresh = useCallback(() => setExercises(getAllExercises()), [])

  useEffect(() => {
    window.addEventListener(CUSTOM_EXERCISES_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CUSTOM_EXERCISES_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  return exercises
}

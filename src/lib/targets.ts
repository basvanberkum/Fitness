import type { MuscleGroup } from '../data/exercises'

export interface MuscleTarget {
  min: number
  max: number
}

/**
 * Standaard richtwaarden voor "harde sets" per spiergroep per week.
 * Dit is een algemene, veelgebruikte vuistregel uit krachttraining-coaching
 * (vaak aangeduid als ergens tussen ~10-20 sets per spiergroep per week voor
 * spiergroei bij recreatieve sporters). Dit is GEEN exact wetenschappelijk
 * vastgesteld getal voor jouw specifieke situatie — je kan deze hieronder
 * zelf per spiergroep aanpassen (bijv. hoger zetten voor een spiergroep
 * waar je op focust).
 */
export const DEFAULT_WEEKLY_SET_TARGETS: Record<MuscleGroup, MuscleTarget> = {
  chest: { min: 10, max: 20 },
  back: { min: 10, max: 20 },
  quads: { min: 10, max: 20 },
  shoulders: { min: 8, max: 16 },
  hamstrings: { min: 8, max: 16 },
  glutes: { min: 8, max: 16 },
  biceps: { min: 6, max: 14 },
  triceps: { min: 6, max: 14 },
  calves: { min: 6, max: 14 },
  core: { min: 6, max: 14 },
}

const STORAGE_KEY = 'fitness-tracker:custom-targets:v1'
const EVENT_NAME = 'fitness-tracker:targets-changed'

export const TARGETS_CHANGED_EVENT = EVENT_NAME

type TargetOverrides = Partial<Record<MuscleGroup, MuscleTarget>>

function readOverrides(): TargetOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

function writeOverrides(overrides: TargetOverrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

/** Standaardwaarden met eventuele eigen aanpassingen erover heen. */
export function getEffectiveTargets(): Record<MuscleGroup, MuscleTarget> {
  const overrides = readOverrides()
  const result = {} as Record<MuscleGroup, MuscleTarget>
  for (const muscle of Object.keys(DEFAULT_WEEKLY_SET_TARGETS) as MuscleGroup[]) {
    result[muscle] = overrides[muscle] ?? DEFAULT_WEEKLY_SET_TARGETS[muscle]
  }
  return result
}

export function setMuscleTarget(muscle: MuscleGroup, target: MuscleTarget) {
  const overrides = readOverrides()
  overrides[muscle] = target
  writeOverrides(overrides)
}

export function resetMuscleTarget(muscle: MuscleGroup) {
  const overrides = readOverrides()
  delete overrides[muscle]
  writeOverrides(overrides)
}

export function resetAllTargets() {
  writeOverrides({})
}

export function hasCustomTarget(muscle: MuscleGroup): boolean {
  return muscle in readOverrides()
}

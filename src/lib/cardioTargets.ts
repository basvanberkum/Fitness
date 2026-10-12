import type { CardioIntensity } from '../data/exercises'

export interface CardioTarget {
  minutesPerWeek: number
}

export const CARDIO_INTENSITY_LABELS: Record<CardioIntensity, string> = {
  intensive: 'Intensief (hardlopen, fietsen, zwemmen, skateboarden, ...)',
  light: 'Licht (wandelen)',
}

/**
 * Standaard wekelijkse cardio-doelen, zoals door jou aangegeven: 45 minuten intensief
 * sporten en 90 minuten wandelen per week. Net als bij de spiergroep-doelen is dit een
 * startpunt — hieronder zelf aan te passen.
 */
export const DEFAULT_CARDIO_TARGETS: Record<CardioIntensity, CardioTarget> = {
  intensive: { minutesPerWeek: 45 },
  light: { minutesPerWeek: 90 },
}

const STORAGE_KEY = 'fitness-tracker:custom-cardio-targets:v1'
const EVENT_NAME = 'fitness-tracker:cardio-targets-changed'

export const CARDIO_TARGETS_CHANGED_EVENT = EVENT_NAME

type CardioTargetOverrides = Partial<Record<CardioIntensity, CardioTarget>>

function readOverrides(): CardioTargetOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

function writeOverrides(overrides: CardioTargetOverrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

/** Standaardwaarden met eventuele eigen aanpassingen erover heen. */
export function getEffectiveCardioTargets(): Record<CardioIntensity, CardioTarget> {
  const overrides = readOverrides()
  const result = {} as Record<CardioIntensity, CardioTarget>
  for (const intensity of Object.keys(DEFAULT_CARDIO_TARGETS) as CardioIntensity[]) {
    result[intensity] = overrides[intensity] ?? DEFAULT_CARDIO_TARGETS[intensity]
  }
  return result
}

export function setCardioTarget(intensity: CardioIntensity, target: CardioTarget) {
  const overrides = readOverrides()
  overrides[intensity] = target
  writeOverrides(overrides)
}

export function resetCardioTarget(intensity: CardioIntensity) {
  const overrides = readOverrides()
  delete overrides[intensity]
  writeOverrides(overrides)
}

export function resetAllCardioTargets() {
  writeOverrides({})
}

export function hasCustomCardioTarget(intensity: CardioIntensity): boolean {
  return intensity in readOverrides()
}

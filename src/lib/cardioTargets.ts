import type { CardioIntensity } from '../data/exercises'

export interface CardioTarget {
  minutesPerWeek: number
}

export const CARDIO_INTENSITY_LABELS: Record<CardioIntensity, string> = {
  intensive: 'Intensief (hardlopen, fietsen, zwemmen, skateboarden, ...) — telt mee voor je wekelijkse doel',
  light: 'Licht (wandelen) — geen apart doel, telt niet mee',
}

/**
 * Standaard wekelijks cardio-doel: 45 minuten intensief sporten per week, zoals door jou
 * aangegeven. Alleen de intensieve cardio heeft een doel — wandelen/lichte cardio houd je
 * zelf al bij, dus die heeft hier bewust geen eigen streefwaarde.
 */
export const DEFAULT_CARDIO_TARGET: CardioTarget = { minutesPerWeek: 45 }

const STORAGE_KEY = 'fitness-tracker:custom-cardio-targets:v1'
const EVENT_NAME = 'fitness-tracker:cardio-targets-changed'

export const CARDIO_TARGETS_CHANGED_EVENT = EVENT_NAME

/** Zelfde opslagvorm als toen er nog een doel per intensiteit was — alleen 'intensive'
 * wordt nog gelezen/geschreven, zodat een eerder ingestelde waarde behouden blijft. */
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

/** Standaardwaarde met een eventuele eigen aanpassing erover heen. */
export function getEffectiveCardioTarget(): CardioTarget {
  return readOverrides().intensive ?? DEFAULT_CARDIO_TARGET
}

export function setCardioTarget(target: CardioTarget) {
  const overrides = readOverrides()
  overrides.intensive = target
  writeOverrides(overrides)
}

export function resetCardioTarget() {
  const overrides = readOverrides()
  delete overrides.intensive
  writeOverrides(overrides)
}

export function hasCustomCardioTarget(): boolean {
  return 'intensive' in readOverrides()
}

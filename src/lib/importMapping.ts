import { EXERCISES, type Exercise } from '../data/exercises'
import { normalizeDutchText } from './dutchNumbers'

export type ImportField = 'date' | 'exercise' | 'weight' | 'weightUnit' | 'reps' | 'setsCount' | 'notes'

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  date: 'Datum',
  exercise: 'Oefening',
  weight: 'Gewicht',
  weightUnit: 'Gewichtseenheid (kg/lbs)',
  reps: 'Herhalingen (reps)',
  setsCount: 'Aantal sets',
  notes: 'Notitie',
}

const FIELD_KEYWORDS: Record<ImportField, string[]> = {
  date: ['date', 'datum', 'workout date', 'start time', 'timestamp'],
  exercise: ['exercise name', 'exercise', 'oefening', 'oefeningnaam'],
  weight: ['weight', 'gewicht', 'load', 'kg'],
  weightUnit: ['weight unit', 'unit', 'eenheid'],
  reps: ['reps', 'repetitions', 'herhalingen', 'rep count'],
  setsCount: ['sets', 'set count', 'number of sets', 'aantal sets', 'setjes'],
  notes: ['notes', 'notitie', 'opmerking', 'comment', 'workout notes'],
}

// Kolommen die duiden op "één rij per set" i.p.v. "één rij per oefening" (zoals bij de Strong-app export).
const SET_ORDER_KEYWORDS = ['set order', 'set #', 'set number', 'set index']

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase()
}

export function guessColumnMapping(headers: string[]): Partial<Record<ImportField, string>> {
  const normalized = headers.map((h) => ({ original: h, norm: normalizeHeader(h) }))
  const mapping: Partial<Record<ImportField, string>> = {}

  for (const field of Object.keys(FIELD_KEYWORDS) as ImportField[]) {
    const keywords = FIELD_KEYWORDS[field]
    // exacte match eerst
    const exact = normalized.find((h) => keywords.includes(h.norm))
    if (exact) {
      mapping[field] = exact.original
      continue
    }
    // dan substring-match, met uitzondering van "set order" voor het setsCount-veld
    const partial = normalized.find((h) => {
      if (field === 'setsCount' && SET_ORDER_KEYWORDS.some((k) => h.norm.includes(k))) return false
      return keywords.some((k) => h.norm.includes(k))
    })
    if (partial) mapping[field] = partial.original
  }

  return mapping
}

/** Bepaalt of de export waarschijnlijk één rij per uitgevoerde set bevat (zoals Strong/Hevy exports). */
export function looksLikePerSetFormat(headers: string[]): boolean {
  const normalized = headers.map(normalizeHeader)
  return normalized.some((h) => SET_ORDER_KEYWORDS.some((k) => h.includes(k)))
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

/**
 * Probeert een vrije-tekst oefeningnaam (uit een import-bestand) te matchen aan onze
 * oefeningenbibliotheek, op naam of alias. Retourneert null als er geen goede match is,
 * zodat de gebruiker deze handmatig kan koppelen.
 */
export function matchExerciseByFreeText(rawName: string): Exercise | null {
  const normalizedInput = normalizeDutchText(rawName)
  if (!normalizedInput) return null

  for (const exercise of EXERCISES) {
    const candidates = [exercise.name, ...exercise.aliases].map(normalizeDutchText)
    if (candidates.includes(normalizedInput)) return exercise
  }

  for (const exercise of EXERCISES) {
    const candidates = [exercise.name, ...exercise.aliases].map(normalizeDutchText)
    if (candidates.some((c) => c.length > 2 && (normalizedInput.includes(c) || c.includes(normalizedInput)))) {
      return exercise
    }
  }

  // laatste redmiddel: kleine tikfouten tolereren op de dichtstbijzijnde alias
  let best: { exercise: Exercise; distance: number } | null = null
  for (const exercise of EXERCISES) {
    for (const alias of [exercise.name, ...exercise.aliases]) {
      const normalizedAlias = normalizeDutchText(alias)
      const distance = levenshtein(normalizedInput, normalizedAlias)
      const threshold = Math.max(2, Math.floor(normalizedAlias.length * 0.2))
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { exercise, distance }
      }
    }
  }
  return best?.exercise ?? null
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.45359237 * 100) / 100
}

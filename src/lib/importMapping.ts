import type { Exercise } from '../data/exercises'
import { normalizeDutchText } from './dutchNumbers'
import { getAllExercises } from './exerciseCatalog'

export type ImportField =
  | 'date'
  | 'endDate'
  | 'exercise'
  | 'weight'
  | 'weightUnit'
  | 'reps'
  | 'setsCount'
  | 'notes'
  | 'workoutName'
  | 'bodyWeight'

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  date: 'Datum (start)',
  endDate: 'Einde training (optioneel, voor sessieduur)',
  exercise: 'Oefening',
  weight: 'Gewicht',
  weightUnit: 'Gewichtseenheid (kg/lbs)',
  reps: 'Herhalingen (reps)',
  setsCount: 'Aantal sets',
  notes: 'Notitie',
  workoutName: 'Workout naam',
  bodyWeight: 'Lichaamsgewicht (optioneel)',
}

const FIELD_KEYWORDS: Record<ImportField, string[]> = {
  date: ['date', 'datum', 'workout date', 'start time', 'start training', 'starttijd', 'timestamp', 'start'],
  endDate: ['end time', 'einde training', 'eindtijd', 'end date', 'einde'],
  exercise: ['exercise name', 'exercise', 'oefening', 'oefeningnaam'],
  weight: ['weight', 'gewicht', 'load', 'kg'],
  weightUnit: ['weight unit', 'unit', 'eenheid'],
  reps: ['reps', 'repetitions', 'herhalingen', 'rep count', 'herh'],
  setsCount: ['sets', 'set count', 'number of sets', 'aantal sets', 'setjes'],
  notes: ['notes', 'notitie', 'notities', 'opmerking', 'comment', 'workout notes'],
  workoutName: ['workout name', 'workout naam', 'session name', 'routine', 'naam'],
  bodyWeight: ['lichaamsgewicht', 'body weight', 'bodyweight'],
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

  const allExercises = getAllExercises()

  for (const exercise of allExercises) {
    const candidates = [exercise.name, ...exercise.aliases].map(normalizeDutchText)
    if (candidates.includes(normalizedInput)) return exercise
  }

  // Substring-match: neem over ALLE oefeningen de LANGSTE (dus meest specifieke) match,
  // in plaats van de eerste de beste. Anders kan bijv. "Shoulder Dumbbell Press" per
  // ongeluk matchen op de kortere alias "dumbbell press" van Dumbbell Bankdrukken,
  // terwijl er een specifiekere (langere) alias "shoulder dumbbell press" bestaat.
  // Een kandidaat die simpelweg de HELE input bevat (bijv. alias "crab walking" bevat
  // het te generieke, losstaande woord "walking") mag alleen meetellen als de input zelf
  // uit meerdere woorden bestaat. Anders zou een kort, generiek los woord (zoals een
  // cardio-activiteit die niet in onze bibliotheek zit) ten onrechte matchen op een
  // toevallig langere, specifieke oefeningnaam die dat woord ergens bevat.
  const inputHasMultipleWords = normalizedInput.includes(' ')

  let bestSubstring: { exercise: Exercise; length: number } | null = null
  for (const exercise of allExercises) {
    const candidates = [exercise.name, ...exercise.aliases].map(normalizeDutchText)
    for (const c of candidates) {
      if (c.length <= 2) continue
      const inputContainsCandidate = normalizedInput.includes(c)
      const candidateContainsInput = inputHasMultipleWords && c.includes(normalizedInput)
      if (inputContainsCandidate || candidateContainsInput) {
        if (!bestSubstring || c.length > bestSubstring.length) {
          bestSubstring = { exercise, length: c.length }
        }
      }
    }
  }
  if (bestSubstring) return bestSubstring.exercise

  // laatste redmiddel: kleine tikfouten tolereren op de dichtstbijzijnde alias
  let best: { exercise: Exercise; distance: number } | null = null
  for (const exercise of allExercises) {
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

import type { ParsedCsv } from './csv'
import { lbsToKg, type ImportField } from './importMapping'
import type { LogEntry, SetEntry } from './storage'

export type ColumnMapping = Partial<Record<ImportField, string>>

export interface ImportDraftGroup {
  key: string
  rawExerciseName: string
  date: Date
  sets: SetEntry[]
  workoutName?: string
}

export interface ImportParseResult {
  groups: ImportDraftGroup[]
  distinctExerciseNames: string[]
  skippedRows: number
  totalRows: number
}

/** Best-effort datumparser voor uiteenlopende export-formaten (ISO, DD-MM-JJJJ, DD/MM/JJJJ, met/zonder tijd). */
export function parseFlexibleDate(raw: string): Date | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Eerst dag-maand-jaar herkennen (NL-conventie, bijv. "05-09-2026" of "5/9/2026 18:00").
  // new Date(...) mag hier NIET als eerste worden geprobeerd: browsers interpreteren zo'n
  // string doorgaans als Amerikaans maand-dag-jaar, wat voor Nederlandse datums een stille
  // verkeerde datum oplevert (5 sep. -> 5 mei).
  const match = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/)
  if (match) {
    const [, a, b, year, hour, minute] = match
    const aNum = Number(a)
    const bNum = Number(b)
    // Nederlandse conventie dag-maand-jaar, tenzij het eerste getal geen geldige dag kan
    // zijn (>12 en <=31 blijft dag; >31 is ongeldig) terwijl het tweede dat wel is.
    const aIsDay = aNum <= 31
    const bCouldBeMonth = bNum <= 12
    const dayFirst = aIsDay && (bCouldBeMonth || aNum > 12)
    const finalDay = dayFirst ? aNum : bNum
    const finalMonth = dayFirst ? bNum : aNum
    const date = new Date(
      Number(year),
      finalMonth - 1,
      finalDay,
      hour ? Number(hour) : 0,
      minute ? Number(minute) : 0,
    )
    if (!Number.isNaN(date.getTime())) return date
  }

  // Fallback voor formaten die hierboven niet matchen, met name ISO-datums
  // ("2026-09-01" of "2026-09-01 18:00"), die ondubbelzinnig zijn (jaar eerst).
  const native = new Date(trimmed)
  if (!Number.isNaN(native.getTime()) && /\d{4}/.test(trimmed)) return native

  return null
}

function normalizeUnit(raw: string | undefined): 'kg' | 'lbs' {
  if (!raw) return 'kg'
  const v = raw.trim().toLowerCase()
  if (v.startsWith('lb') || v === 'pounds' || v === 'pound') return 'lbs'
  return 'kg'
}

/**
 * Zet ingelezen CSV-rijen om naar gegroepeerde workout-entries (per datum + oefening),
 * op basis van de gekozen kolom-mapping. Rijen zonder herkenbare datum of oefeningnaam
 * worden overgeslagen en meegeteld in `skippedRows`.
 */
export function buildImportDraft(csv: ParsedCsv, mapping: ColumnMapping): ImportParseResult {
  const idx = (field: ImportField): number => {
    const header = mapping[field]
    if (!header) return -1
    return csv.headers.indexOf(header)
  }

  const dateIdx = idx('date')
  const exerciseIdx = idx('exercise')
  const weightIdx = idx('weight')
  const weightUnitIdx = idx('weightUnit')
  const repsIdx = idx('reps')
  const setsCountIdx = idx('setsCount')
  const notesIdx = idx('notes')
  const workoutNameIdx = idx('workoutName')

  const groups = new Map<string, ImportDraftGroup>()
  const exerciseNames = new Set<string>()
  let skippedRows = 0

  for (const row of csv.rows) {
    const rawDate = dateIdx >= 0 ? row[dateIdx] : ''
    const rawExercise = exerciseIdx >= 0 ? row[exerciseIdx]?.trim() : ''
    const date = rawDate ? parseFlexibleDate(rawDate) : null

    if (!date || !rawExercise) {
      skippedRows++
      continue
    }

    exerciseNames.add(rawExercise)

    const unit = normalizeUnit(weightUnitIdx >= 0 ? row[weightUnitIdx] : undefined)
    const rawWeight = weightIdx >= 0 ? parseFloat((row[weightIdx] ?? '0').replace(',', '.')) : 0
    const weight = Number.isFinite(rawWeight) ? (unit === 'lbs' ? lbsToKg(rawWeight) : rawWeight) : 0
    const rawReps = repsIdx >= 0 ? parseFloat((row[repsIdx] ?? '0').replace(',', '.')) : 0
    const reps = Number.isFinite(rawReps) ? Math.round(rawReps) : 0
    const setsCount = setsCountIdx >= 0 ? Math.max(1, Math.round(Number(row[setsCountIdx]) || 1)) : 1
    const note = notesIdx >= 0 ? row[notesIdx]?.trim() || undefined : undefined
    const workoutName = workoutNameIdx >= 0 ? row[workoutNameIdx]?.trim() || undefined : undefined

    const key = `${rawExercise}|${date.toISOString().slice(0, 10)}`
    let group = groups.get(key)
    if (!group) {
      group = { key, rawExerciseName: rawExercise, date, sets: [], workoutName }
      groups.set(key, group)
    }

    if (setsCountIdx >= 0 && weightIdx >= 0) {
      // "aggregated" formaat: deze rij vertegenwoordigt meteen N sets met dezelfde reps/gewicht/notitie
      for (let i = 0; i < setsCount; i++) group.sets.push({ reps, weight, note })
    } else {
      // "per-set" formaat: elke rij is één set, met haar eigen notitie
      group.sets.push({ reps, weight, note })
    }
  }

  return {
    groups: [...groups.values()].sort((a, b) => a.date.getTime() - b.date.getTime()),
    distinctExerciseNames: [...exerciseNames].sort((a, b) => a.localeCompare(b)),
    skippedRows,
    totalRows: csv.rows.length,
  }
}

export function draftGroupsToLogEntries(
  groups: ImportDraftGroup[],
  exerciseIdByName: Map<string, string | null>,
): Omit<LogEntry, 'id'>[] {
  const entries: Omit<LogEntry, 'id'>[] = []
  for (const group of groups) {
    const exerciseId = exerciseIdByName.get(group.rawExerciseName)
    if (!exerciseId) continue
    entries.push({
      exerciseId,
      date: group.date.toISOString(),
      sets: group.sets,
      workoutName: group.workoutName,
      source: 'import',
    })
  }
  return entries
}

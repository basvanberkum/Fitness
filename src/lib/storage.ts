export interface SetEntry {
  reps: number
  weight: number
  note?: string
}

export interface LogEntry {
  id: string
  exerciseId: string
  /** ISO datetime string */
  date: string
  sets: SetEntry[]
  /** Vrije titel voor de hele training, bijv. "Push", "Upper", "Legs + Side delts" */
  workoutName?: string
  /** Duur van de hele trainingssessie in minuten, indien bekend (bijv. uit CSV-import) */
  durationMinutes?: number
  note?: string
  /** De originele ingesproken/getypte tekst, voor controle achteraf */
  rawInput?: string
  source: 'voice' | 'manual' | 'import'
}

const STORAGE_KEY = 'fitness-tracker:logs:v1'

function readRaw(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeRaw(logs: LogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  window.dispatchEvent(new CustomEvent('fitness-tracker:logs-changed'))
}

export function getLogs(): LogEntry[] {
  return readRaw().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function addLog(entry: Omit<LogEntry, 'id'>): LogEntry {
  const logs = readRaw()
  const newEntry: LogEntry = { ...entry, id: crypto.randomUUID() }
  logs.push(newEntry)
  writeRaw(logs)
  return newEntry
}

function dedupeKey(entry: Pick<LogEntry, 'exerciseId' | 'date' | 'sets'>): string {
  // Datum afgerond op de minuut, zodat kleine tijdsverschillen bij export/import geen ruis geven.
  const minuteDate = entry.date.slice(0, 16)
  return `${entry.exerciseId}|${minuteDate}|${JSON.stringify(entry.sets)}`
}

/**
 * Voegt meerdere logs in één keer toe (bijv. bij een import). Exacte duplicaten van al
 * bestaande logs worden overgeslagen, behalve dat een duplicaat die een sessieduur
 * aanlevert die de bestaande log nog mist, die duur alsnog bijwerkt (backfill) — zodat
 * opnieuw importeren van dezelfde CSV, nu met "Einde training" gekoppeld, de duur ook
 * met terugwerkende kracht aan eerder geïmporteerde trainingen toevoegt.
 */
export function bulkAddLogs(entries: Omit<LogEntry, 'id'>[]): {
  added: number
  skippedDuplicates: number
  updated: number
} {
  const logs = readRaw()
  const indexByKey = new Map(logs.map((l, i) => [dedupeKey(l), i]))
  let added = 0
  let skippedDuplicates = 0
  let updated = 0

  for (const entry of entries) {
    const key = dedupeKey(entry)
    const existingIndex = indexByKey.get(key)
    if (existingIndex !== undefined) {
      const existing = logs[existingIndex]
      if (!existing.durationMinutes && entry.durationMinutes) {
        logs[existingIndex] = { ...existing, durationMinutes: entry.durationMinutes }
        updated++
      } else {
        skippedDuplicates++
      }
      continue
    }
    indexByKey.set(key, logs.length)
    logs.push({ ...entry, id: crypto.randomUUID() })
    added++
  }

  writeRaw(logs)
  return { added, skippedDuplicates, updated }
}

export function deleteLog(id: string) {
  const logs = readRaw().filter((l) => l.id !== id)
  writeRaw(logs)
}

export function updateLog(id: string, updates: Partial<Omit<LogEntry, 'id'>>) {
  const logs = readRaw().map((l) => (l.id === id ? { ...l, ...updates } : l))
  writeRaw(logs)
}

export function clearAllLogs() {
  writeRaw([])
}

/** Recent gebruikte workout-namen, meest recent eerst, voor suggesties bij het loggen. */
export function getRecentWorkoutNames(limit = 15): string[] {
  const seen = new Set<string>()
  for (const log of getLogs()) {
    const name = log.workoutName?.trim()
    if (name) seen.add(name)
    if (seen.size >= limit) break
  }
  return [...seen]
}

export interface BodyWeightEntry {
  /** Kalenderdag, YYYY-MM-DD */
  date: string
  weightKg: number
}

const BODYWEIGHT_STORAGE_KEY = 'fitness-tracker:bodyweight:v1'

function readBodyWeightRaw(): BodyWeightEntry[] {
  try {
    const raw = localStorage.getItem(BODYWEIGHT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeBodyWeightRaw(entries: BodyWeightEntry[]) {
  localStorage.setItem(BODYWEIGHT_STORAGE_KEY, JSON.stringify(entries))
  window.dispatchEvent(new CustomEvent('fitness-tracker:bodyweight-changed'))
}

export function getBodyWeightEntries(): BodyWeightEntry[] {
  return readBodyWeightRaw().sort((a, b) => a.date.localeCompare(b.date))
}

/** Voegt lichaamsgewicht-metingen toe (bijv. uit een import); per dag wordt maar één meting bewaard. */
export function bulkAddBodyWeightEntries(entries: BodyWeightEntry[]): { added: number; updated: number } {
  const byDate = new Map(readBodyWeightRaw().map((e) => [e.date, e.weightKg]))
  let added = 0
  let updated = 0
  for (const entry of entries) {
    if (!byDate.has(entry.date)) added++
    else if (byDate.get(entry.date) !== entry.weightKg) updated++
    byDate.set(entry.date, entry.weightKg)
  }
  writeBodyWeightRaw([...byDate.entries()].map(([date, weightKg]) => ({ date, weightKg })))
  return { added, updated }
}

export function clearAllBodyWeightEntries() {
  writeBodyWeightRaw([])
}

interface BackupFile {
  logs: LogEntry[]
  bodyWeight: BodyWeightEntry[]
}

export function exportBackupJson(): string {
  const backup: BackupFile = { logs: readRaw(), bodyWeight: readBodyWeightRaw() }
  return JSON.stringify(backup, null, 2)
}

const LAST_EXPORT_KEY = 'fitness-tracker:last-export:v1'

/** Roep aan nadat de gebruiker daadwerkelijk een back-up heeft gedownload. */
export function recordBackupExported() {
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString())
}

/** Dagen sinds de laatste back-up-export, of null als er nog nooit één is gemaakt. */
export function daysSinceLastBackup(now: Date = new Date()): number | null {
  const raw = localStorage.getItem(LAST_EXPORT_KEY)
  if (!raw) return null
  return Math.floor((now.getTime() - new Date(raw).getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * Importeert een back-up-bestand: ondersteunt zowel het huidige formaat
 * ({ logs, bodyWeight }) als het oudere formaat (alleen een array van logs),
 * zodat eerder gedownloade back-ups ook nu nog werken.
 */
export function importBackupJson(json: string): {
  logs: { added: number; skippedDuplicates: number; updated: number }
  bodyWeight: { added: number; updated: number }
} {
  const parsed = JSON.parse(json)

  if (Array.isArray(parsed)) {
    const entries: Omit<LogEntry, 'id'>[] = parsed.map((entry: LogEntry) => {
      const { id: _id, ...rest } = entry
      return rest
    })
    return { logs: bulkAddLogs(entries), bodyWeight: { added: 0, updated: 0 } }
  }

  if (parsed && Array.isArray(parsed.logs)) {
    const entries: Omit<LogEntry, 'id'>[] = parsed.logs.map((entry: LogEntry) => {
      const { id: _id, ...rest } = entry
      return rest
    })
    const logsResult = bulkAddLogs(entries)
    const bodyWeightResult = Array.isArray(parsed.bodyWeight)
      ? bulkAddBodyWeightEntries(parsed.bodyWeight)
      : { added: 0, updated: 0 }
    return { logs: logsResult, bodyWeight: bodyWeightResult }
  }

  throw new Error('Ongeldig bestand: verwacht een back-up van deze app')
}

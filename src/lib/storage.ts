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
 * Voegt meerdere logs in één keer toe (bijv. bij een import), en slaat exacte
 * duplicaten van al bestaande logs over. Retourneert hoeveel er zijn
 * toegevoegd en hoeveel er zijn overgeslagen als duplicaat.
 */
export function bulkAddLogs(entries: Omit<LogEntry, 'id'>[]): { added: number; skippedDuplicates: number } {
  const logs = readRaw()
  const existingKeys = new Set(logs.map(dedupeKey))
  let added = 0
  let skippedDuplicates = 0

  for (const entry of entries) {
    const key = dedupeKey(entry)
    if (existingKeys.has(key)) {
      skippedDuplicates++
      continue
    }
    existingKeys.add(key)
    logs.push({ ...entry, id: crypto.randomUUID() })
    added++
  }

  writeRaw(logs)
  return { added, skippedDuplicates }
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

export function exportLogsJson(): string {
  return JSON.stringify(readRaw(), null, 2)
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

export function importLogsJson(json: string) {
  const parsed = JSON.parse(json)
  if (!Array.isArray(parsed)) throw new Error('Ongeldig bestand: verwacht een lijst met logs')
  writeRaw(parsed)
}

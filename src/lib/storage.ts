export interface SetEntry {
  reps: number
  weight: number
}

export interface LogEntry {
  id: string
  exerciseId: string
  /** ISO datetime string */
  date: string
  sets: SetEntry[]
  note?: string
  /** De originele ingesproken/getypte tekst, voor controle achteraf */
  rawInput?: string
  source: 'voice' | 'manual'
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

export function exportLogsJson(): string {
  return JSON.stringify(readRaw(), null, 2)
}

export function importLogsJson(json: string) {
  const parsed = JSON.parse(json)
  if (!Array.isArray(parsed)) throw new Error('Ongeldig bestand: verwacht een lijst met logs')
  writeRaw(parsed)
}

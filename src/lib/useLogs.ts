import { useCallback, useEffect, useState } from 'react'
import { getLogs, type LogEntry } from './storage'

export function useLogs(): LogEntry[] {
  const [logs, setLogs] = useState<LogEntry[]>(() => getLogs())

  const refresh = useCallback(() => setLogs(getLogs()), [])

  useEffect(() => {
    window.addEventListener('fitness-tracker:logs-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('fitness-tracker:logs-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  return logs
}

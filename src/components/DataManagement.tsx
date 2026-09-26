import { useState } from 'react'
import { bulkAddLogs, clearAllLogs, exportLogsJson, type LogEntry } from '../lib/storage'
import { ImportCsv } from './ImportCsv'

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function DataManagement() {
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [jsonImportResult, setJsonImportResult] = useState<{ added: number; skippedDuplicates: number } | null>(null)
  const [jsonImportError, setJsonImportError] = useState<string | null>(null)

  function handleExport() {
    downloadFile(exportLogsJson(), `fitness-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
  }

  async function handleJsonImport(file: File) {
    setJsonImportError(null)
    setJsonImportResult(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed)) throw new Error('not an array')
      const entries: Omit<LogEntry, 'id'>[] = parsed.map((entry: LogEntry) => {
        const { id: _id, ...rest } = entry
        return rest
      })
      const result = bulkAddLogs(entries)
      setJsonImportResult(result)
    } catch {
      setJsonImportError('Kon dit bestand niet importeren. Is het een geldige JSON back-up van deze app?')
    }
  }

  function handleClear() {
    clearAllLogs()
    setConfirmingClear(false)
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-5">
      <ImportCsv />

      <section
        className="rounded-2xl p-5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Back-up
        </h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Download al je gelogde trainingen als JSON-bestand, bijvoorbeeld om te bewaren of naar een andere browser
          over te zetten.
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="mt-3 w-full rounded-lg py-2 text-sm font-medium"
          style={{ color: 'var(--series-push)', border: '1px solid var(--border)' }}
        >
          Exporteer als JSON
        </button>

        <p className="mt-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Of laad een eerder gemaakte JSON back-up in (bijv. van een andere browser). Nieuwe trainingen worden
          toegevoegd aan wat je al hebt; exacte duplicaten worden overgeslagen.
        </p>
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleJsonImport(file)
          }}
          className="mt-2 text-sm"
          style={{ color: 'var(--text-primary)' }}
        />
        {jsonImportError && (
          <p className="mt-2 text-xs" style={{ color: 'var(--status-critical)' }}>
            {jsonImportError}
          </p>
        )}
        {jsonImportResult && (
          <p className="mt-2 text-xs" style={{ color: 'var(--status-good)' }}>
            {jsonImportResult.added} trainingen geïmporteerd
            {jsonImportResult.skippedDuplicates > 0 && <> ({jsonImportResult.skippedDuplicates} duplicaten overgeslagen)</>}.
          </p>
        )}
      </section>

      <section
        className="rounded-2xl p-5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Alle data wissen
        </h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Verwijdert alle gelogde trainingen uit deze browser. Dit kan niet ongedaan worden gemaakt — maak eerst een
          back-up als je twijfelt.
        </p>
        {!confirmingClear ? (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="mt-3 w-full rounded-lg py-2 text-sm font-medium"
            style={{ color: 'var(--status-critical)', border: '1px solid var(--border)' }}
          >
            Wis alle data
          </button>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="flex-1 rounded-lg py-2 text-sm font-medium"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white"
              style={{ background: 'var(--status-critical)' }}
            >
              Ja, alles wissen
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { CATEGORY_LABELS, type ExerciseCategory } from '../data/exercises'
import { parseCsv, type ParsedCsv } from '../lib/csv'
import { useAllExercises } from '../lib/useAllExercises'
import { buildImportDraft, draftGroupsToLogEntries, type ColumnMapping, type ImportParseResult } from '../lib/importCsv'
import { guessColumnMapping, matchExerciseByFreeText, IMPORT_FIELD_LABELS, type ImportField } from '../lib/importMapping'
import { bulkAddBodyWeightEntries, bulkAddLogs } from '../lib/storage'

const REQUIRED_FIELDS: ImportField[] = ['date', 'exercise']
const OPTIONAL_FIELDS: ImportField[] = [
  'weight',
  'weightUnit',
  'reps',
  'setsCount',
  'notes',
  'workoutName',
  'endDate',
  'bodyWeight',
]
const CATEGORIES: ExerciseCategory[] = ['push', 'pull', 'legs', 'core']
const SKIP = '__skip__'

type Step = 'upload' | 'mapping' | 'exercises' | 'preview' | 'done'

export function ImportCsv() {
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState<string | null>(null)
  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [draft, setDraft] = useState<ImportParseResult | null>(null)
  const [exerciseChoice, setExerciseChoice] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ added: number; skippedDuplicates: number; bodyWeightAdded: number } | null>(
    null,
  )
  const allExercises = useAllExercises()

  async function handleFile(file: File) {
    setError(null)
    try {
      const text = await file.text()
      const parsed = parseCsv(text)
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError('Kon geen tabel met gegevens vinden in dit bestand. Controleer of het een CSV-export is.')
        return
      }
      setFileName(file.name)
      setCsv(parsed)
      setMapping(guessColumnMapping(parsed.headers))
      setStep('mapping')
    } catch {
      setError('Kon het bestand niet lezen. Is het een geldig CSV-bestand?')
    }
  }

  function confirmMapping() {
    if (!csv) return
    if (!mapping.date || !mapping.exercise) {
      setError('Kies in elk geval een kolom voor Datum en Oefening.')
      return
    }
    setError(null)
    const parsed = buildImportDraft(csv, mapping)
    setDraft(parsed)
    const initialChoices: Record<string, string> = {}
    for (const name of parsed.distinctExerciseNames) {
      const match = matchExerciseByFreeText(name)
      initialChoices[name] = match ? match.id : SKIP
    }
    setExerciseChoice(initialChoices)
    setStep('exercises')
  }

  function confirmExercises() {
    setStep('preview')
  }

  function confirmImport() {
    if (!draft) return
    const exerciseIdByName = new Map(
      Object.entries(exerciseChoice).map(([name, id]) => [name, id === SKIP ? null : id]),
    )
    const entries = draftGroupsToLogEntries(draft.groups, exerciseIdByName)
    const res = bulkAddLogs(entries)
    const bodyWeightRes = bulkAddBodyWeightEntries(draft.bodyWeightEntries)
    setResult({ ...res, bodyWeightAdded: bodyWeightRes.added + bodyWeightRes.updated })
    setStep('done')
  }

  function reset() {
    setStep('upload')
    setFileName(null)
    setCsv(null)
    setMapping({})
    setDraft(null)
    setExerciseChoice({})
    setError(null)
    setResult(null)
  }

  const skippedExerciseCount = useMemo(
    () => Object.values(exerciseChoice).filter((v) => v === SKIP).length,
    [exerciseChoice],
  )
  const importableGroupCount = useMemo(() => {
    if (!draft) return 0
    return draft.groups.filter((g) => exerciseChoice[g.rawExerciseName] && exerciseChoice[g.rawExerciseName] !== SKIP).length
  }, [draft, exerciseChoice])

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
    >
      <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        Historie importeren (CSV)
      </h2>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
        Upload een CSV-export van je trainingen (bijv. uit Strong, Hevy of een eigen spreadsheet). Je data blijft
        lokaal in je browser — er wordt niets naar een server gestuurd.
      </p>

      {error && (
        <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--surface-page)', color: 'var(--status-critical)' }}>
          {error}
        </p>
      )}

      {step === 'upload' && (
        <div className="mt-3">
          <input
            type="file"
            accept=".csv,.txt,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
            className="text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      )}

      {step === 'mapping' && csv && (
        <div className="mt-3">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Bestand: {fileName} · {csv.rows.length} rijen gevonden
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Let op: bij datums zoals "09-05-2026" gaan we uit van de Nederlandse volgorde dag-maand-jaar (9 mei),
            tenzij het eerste getal groter dan 12 is. Controleer de datums in de volgende stappen.
          </p>

          <div className="mt-3 flex flex-col gap-2">
            {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((field) => (
              <label key={field} className="flex items-center justify-between gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>
                  {IMPORT_FIELD_LABELS[field]}
                  {REQUIRED_FIELDS.includes(field) && <span style={{ color: 'var(--status-critical)' }}> *</span>}
                </span>
                <select
                  value={mapping[field] ?? ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))}
                  className="rounded-lg px-2 py-1.5 text-sm"
                  style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                >
                  <option value="">(geen)</option>
                  {csv.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ background: 'var(--surface-page)' }}>
                  {csv.headers.map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csv.rows.slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="whitespace-nowrap px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={reset} className="rounded-lg px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Annuleren
            </button>
            <button
              type="button"
              onClick={confirmMapping}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white"
              style={{ background: 'var(--series-push)' }}
            >
              Volgende: oefeningen koppelen
            </button>
          </div>
        </div>
      )}

      {step === 'exercises' && draft && (
        <div className="mt-3">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {draft.distinctExerciseNames.length} unieke oefeningnamen gevonden ({draft.groups.length} trainingen,{' '}
            {draft.skippedRows} rijen overgeslagen door ontbrekende datum/oefening). Koppel elke naam aan een
            oefening uit de bibliotheek, of sla hem over.
          </p>

          <div className="mt-3 flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
            {draft.distinctExerciseNames.map((name) => (
              <label key={name} className="flex items-center justify-between gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="truncate" title={name} style={{ color: 'var(--text-primary)' }}>
                  {name}
                </span>
                <select
                  value={exerciseChoice[name] ?? SKIP}
                  onChange={(e) => setExerciseChoice((c) => ({ ...c, [name]: e.target.value }))}
                  className="rounded-lg px-2 py-1.5 text-xs"
                  style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                >
                  <option value={SKIP}>Overslaan</option>
                  {CATEGORIES.map((cat) => (
                    <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                      {allExercises.filter((e) => e.category === cat).map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {skippedExerciseCount > 0 && (
            <p className="mt-2 text-xs" style={{ color: 'var(--status-warning)' }}>
              {skippedExerciseCount} naam/namen worden overgeslagen en dus niet geïmporteerd.
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setStep('mapping')} className="rounded-lg px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Terug
            </button>
            <button
              type="button"
              onClick={confirmExercises}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white"
              style={{ background: 'var(--series-push)' }}
            >
              Volgende: controleren
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && draft && (
        <div className="mt-3">
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Klaar om <strong>{importableGroupCount}</strong> trainingen te importeren
            {draft.groups.length - importableGroupCount > 0 && (
              <> ({draft.groups.length - importableGroupCount} overgeslagen door niet-gekoppelde oefeningen)</>
            )}
            .
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Exacte duplicaten van al bestaande logs worden automatisch overgeslagen. Gewicht wordt aangenomen in kg,
            tenzij je bestand een eenheid-kolom met "lbs" bevatte.
          </p>

          <div className="mt-3 overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ background: 'var(--surface-page)' }}>
                  <th className="px-2 py-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Datum</th>
                  <th className="px-2 py-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Oefening</th>
                  <th className="px-2 py-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Sets</th>
                </tr>
              </thead>
              <tbody>
                {draft.groups.slice(0, 6).map((g) => (
                  <tr key={g.key}>
                    <td className="whitespace-nowrap px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                      {g.date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                      {g.rawExerciseName}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>
                      {g.sets.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {draft.groups.length > 6 && (
              <p className="px-2 py-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                + {draft.groups.length - 6} meer
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setStep('exercises')} className="rounded-lg px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Terug
            </button>
            <button
              type="button"
              onClick={confirmImport}
              disabled={importableGroupCount === 0}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-40"
              style={{ background: 'var(--series-push)' }}
            >
              Importeren
            </button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="mt-3">
          <p className="text-sm" style={{ color: 'var(--status-good)' }}>
            {result.added} trainingen geïmporteerd
            {result.skippedDuplicates > 0 && <> ({result.skippedDuplicates} duplicaten overgeslagen)</>}.
          </p>
          {result.bodyWeightAdded > 0 && (
            <p className="mt-1 text-sm" style={{ color: 'var(--status-good)' }}>
              {result.bodyWeightAdded} lichaamsgewicht-metingen verwerkt.
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-3 w-full rounded-lg py-2 text-sm font-medium"
            style={{ color: 'var(--series-push)', border: '1px solid var(--border)' }}
          >
            Nog een bestand importeren
          </button>
        </div>
      )}
    </div>
  )
}

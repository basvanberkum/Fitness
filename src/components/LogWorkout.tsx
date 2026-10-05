import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORY_LABELS, type ExerciseCategory } from '../data/exercises'
import { findExercise } from '../lib/exerciseCatalog'
import { addLog, deleteLog, getRecentWorkoutNames, updateLog, type LogEntry, type SetEntry } from '../lib/storage'
import { summarizeSets } from '../lib/setSummary'
import { useAllExercises } from '../lib/useAllExercises'
import {
  isSpeechRecognitionSupported,
  parseWorkoutText,
  startVoiceListening,
  type VoiceListenHandle,
} from '../lib/voiceParser'

const CATEGORIES: ExerciseCategory[] = ['push', 'pull', 'legs', 'core']

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function emptySetRow(reps = 10, weight = 20): SetEntry {
  return { reps, weight }
}

export function LogWorkout({ logs }: { logs: LogEntry[] }) {
  const allExercises = useAllExercises()
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [source, setSource] = useState<'voice' | 'manual'>('manual')

  const [exerciseId, setExerciseId] = useState(allExercises[0]?.id ?? '')
  const [setRows, setSetRows] = useState<SetEntry[]>([emptySetRow()])
  const [bodyweight, setBodyweight] = useState(false)
  const [workoutName, setWorkoutName] = useState('')
  const [editingLogId, setEditingLogId] = useState<string | null>(null)

  const handleRef = useRef<VoiceListenHandle | null>(null)
  const speechSupported = useMemo(() => isSpeechRecognitionSupported(), [])
  // Leest bewust opnieuw uit storage zodra `logs` verandert, zodat net gebruikte
  // workout-namen meteen als suggestie verschijnen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recentWorkoutNames = useMemo(() => getRecentWorkoutNames(), [logs])

  useEffect(() => () => handleRef.current?.stop(), [])

  function applyParsedText(text: string) {
    const parsed = parseWorkoutText(text)
    if (parsed.exercise) setExerciseId(parsed.exercise.id)
    const count = parsed.sets ?? setRows.length
    const reps = parsed.reps ?? setRows[0]?.reps ?? 10
    const isBodyweight = parsed.bodyweight
    const weight = isBodyweight ? 0 : (parsed.weight ?? setRows[0]?.weight ?? 20)
    setBodyweight(isBodyweight)
    setSetRows(Array.from({ length: Math.max(1, count) }, () => emptySetRow(reps, weight)))
  }

  function toggleListening() {
    if (isListening) {
      handleRef.current?.stop()
      return
    }
    setVoiceError(null)
    setSource('voice')
    setIsListening(true)
    handleRef.current = startVoiceListening({
      lang: 'nl-NL',
      onResult: (text, isFinal) => {
        setTranscript(text)
        if (isFinal) applyParsedText(text)
      },
      onError: (message) => {
        setVoiceError(message)
        setIsListening(false)
      },
      onEnd: () => setIsListening(false),
    })
  }

  function updateSetRow(index: number, updates: Partial<SetEntry>) {
    setSetRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...updates } : r)))
  }

  function addSetRow() {
    setSetRows((rows) => {
      const last = rows[rows.length - 1]
      return [...rows, last ? { ...last, note: undefined } : emptySetRow()]
    })
  }

  function removeSetRow(index: number) {
    setSetRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)))
  }

  function handleSave() {
    const sets = setRows.map((r) => ({
      reps: Math.max(0, r.reps),
      weight: bodyweight ? 0 : Math.max(0, r.weight),
      note: r.note?.trim() || undefined,
    }))

    if (editingLogId) {
      updateLog(editingLogId, {
        exerciseId,
        sets,
        workoutName: workoutName.trim() || undefined,
      })
      setEditingLogId(null)
    } else {
      const entry: Omit<LogEntry, 'id'> = {
        exerciseId,
        date: new Date().toISOString(),
        sets,
        workoutName: workoutName.trim() || undefined,
        rawInput: transcript.trim() || undefined,
        source,
      }
      addLog(entry)
    }

    setTranscript('')
    setSetRows([emptySetRow()])
    setSource('manual')
  }

  function startEditing(log: LogEntry) {
    setEditingLogId(log.id)
    setExerciseId(log.exerciseId)
    setWorkoutName(log.workoutName ?? '')
    setBodyweight(log.sets.length > 0 && log.sets.every((s) => s.weight === 0))
    setSetRows(log.sets.map((s) => ({ ...s })))
    setTranscript('')
    setSource('manual')
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEditing() {
    setEditingLogId(null)
    setSetRows([emptySetRow()])
    setWorkoutName('')
    setBodyweight(false)
  }

  const recentLogs = logs.slice(0, 8)

  return (
    <div className="flex flex-col gap-6 px-4 py-5">
      <section
        className="rounded-2xl p-5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Inspreken
        </h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Bijv. "Bankdrukken drie sets van tien herhalingen met vijftig kilo"
        </p>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={toggleListening}
            disabled={!speechSupported}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:opacity-40"
            style={{ background: isListening ? 'var(--status-critical)' : 'var(--series-push)' }}
            aria-pressed={isListening}
            aria-label={isListening ? 'Stop met luisteren' : 'Start spraakherkenning'}
          >
            {isListening ? '■' : '●'}
          </button>
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={isListening ? 'Ik luister...' : 'Tik op de knop en spreek je oefening in, of typ hier'}
            className="min-h-[2.5rem] flex-1 rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
        </div>
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          Herkent spraakherkenning een woord verkeerd (bijv. een Engelse oefeningnaam)? Je kunt de tekst hierboven
          altijd corrigeren vóór je op "Opnieuw interpreteren" tikt.
        </p>

        {!speechSupported && (
          <p className="mt-2 text-xs" style={{ color: 'var(--status-warning)' }}>
            Spraakherkenning wordt niet ondersteund in deze browser (werkt wel in Chrome). Gebruik het formulier hieronder.
          </p>
        )}
        {voiceError && (
          <p className="mt-2 text-xs" style={{ color: 'var(--status-critical)' }}>
            {voiceError}
          </p>
        )}

        <div className="mt-3">
          <button
            type="button"
            onClick={() => applyParsedText(transcript)}
            disabled={!transcript.trim()}
            className="text-xs font-medium underline disabled:opacity-40"
            style={{ color: 'var(--series-push)' }}
          >
            Opnieuw interpreteren naar onderstaand formulier
          </button>
        </div>
      </section>

      <section
        className="rounded-2xl p-5"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Controleer &amp; opslaan
        </h2>

        {editingLogId && (
          <p className="mt-2 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--surface-page)', color: 'var(--text-secondary)' }}>
            Je bewerkt een eerder gelogde training.{' '}
            <button type="button" onClick={cancelEditing} className="underline" style={{ color: 'var(--series-push)' }}>
              Annuleren
            </button>
          </p>
        )}

        <label className="mt-3 block text-sm" style={{ color: 'var(--text-secondary)' }}>
          Workout naam (optioneel)
          <input
            type="text"
            list="workout-name-suggestions"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="Bijv. Push, Upper, Benen"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
          <datalist id="workout-name-suggestions">
            {recentWorkoutNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>

        <label className="mt-3 block text-sm" style={{ color: 'var(--text-secondary)' }}>
          Oefening
          <select
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
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

        <label className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={bodyweight} onChange={(e) => setBodyweight(e.target.checked)} />
          Eigen lichaamsgewicht
        </label>

        <div className="mt-3 flex flex-col gap-2">
          {setRows.map((row, i) => (
            <div key={i} className="rounded-lg p-2" style={{ background: 'var(--surface-page)', border: '1px solid var(--border)' }}>
              <div className="flex items-end gap-2">
                <span className="w-5 shrink-0 pb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {i + 1}
                </span>
                <label className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Reps
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={row.reps}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => updateSetRow(i, { reps: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                    style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />
                </label>
                <label className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Kg
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    value={row.weight}
                    disabled={bodyweight}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => updateSetRow(i, { weight: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg px-2 py-1.5 text-sm disabled:opacity-40"
                    style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeSetRow(i)}
                  disabled={setRows.length <= 1}
                  className="shrink-0 rounded-lg px-2 py-1.5 text-xs disabled:opacity-30"
                  style={{ color: 'var(--status-critical)', border: '1px solid var(--border)' }}
                  aria-label="Set verwijderen"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={row.note ?? ''}
                onChange={(e) => updateSetRow(i, { note: e.target.value })}
                placeholder="Notitie bij deze set (optioneel)"
                className="mt-2 w-full rounded-lg px-2 py-1.5 text-xs"
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addSetRow}
          className="mt-2 w-full rounded-lg py-2 text-xs font-medium"
          style={{ color: 'var(--series-push)', border: '1px dashed var(--border)' }}
        >
          + Set toevoegen
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-white"
          style={{ background: 'var(--series-push)' }}
        >
          {editingLogId ? 'Wijzigingen opslaan' : 'Opslaan'}
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Recent gelogd
        </h2>
        {recentLogs.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nog niets gelogd.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {recentLogs.map((log) => {
            const exercise = findExercise(log.exerciseId)
            return (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {exercise?.name ?? log.exerciseId}
                    {log.workoutName && (
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                        · {log.workoutName}
                      </span>
                    )}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDateTime(log.date)} · {summarizeSets(log.sets)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => startEditing(log)}
                    style={{ color: 'var(--series-push)' }}
                    aria-label="Bewerken"
                  >
                    Bewerken
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteLog(log.id)}
                    style={{ color: 'var(--status-critical)' }}
                    aria-label="Verwijderen"
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

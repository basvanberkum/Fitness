import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORY_LABELS, EXERCISES, type ExerciseCategory, findExerciseById } from '../data/exercises'
import { addLog, deleteLog, type LogEntry } from '../lib/storage'
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

export function LogWorkout({ logs }: { logs: LogEntry[] }) {
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [source, setSource] = useState<'voice' | 'manual'>('manual')

  const [exerciseId, setExerciseId] = useState(EXERCISES[0].id)
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState(20)
  const [bodyweight, setBodyweight] = useState(false)
  const [note, setNote] = useState('')

  const handleRef = useRef<VoiceListenHandle | null>(null);
  const speechSupported = useMemo(() => isSpeechRecognitionSupported(), [])

  useEffect(() => () => handleRef.current?.stop(), [])

  function applyParsedText(text: string) {
    const parsed = parseWorkoutText(text)
    if (parsed.exercise) setExerciseId(parsed.exercise.id)
    if (parsed.sets !== null) setSets(parsed.sets)
    if (parsed.reps !== null) setReps(parsed.reps)
    if (parsed.bodyweight) {
      setBodyweight(true)
    } else if (parsed.weight !== null) {
      setBodyweight(false)
      setWeight(parsed.weight)
    }
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

  function handleSave() {
    const setCount = Math.max(1, sets)
    const entry: Omit<LogEntry, 'id'> = {
      exerciseId,
      date: new Date().toISOString(),
      sets: Array.from({ length: setCount }, () => ({
        reps: Math.max(0, reps),
        weight: bodyweight ? 0 : Math.max(0, weight),
      })),
      note: note.trim() || undefined,
      rawInput: transcript.trim() || undefined,
      source,
    }
    addLog(entry)
    setTranscript('')
    setNote('')
    setSource('manual')
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
          <div className="min-h-[2.5rem] flex-1 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--surface-page)', color: 'var(--text-primary)' }}>
            {transcript || <span style={{ color: 'var(--text-muted)' }}>{isListening ? 'Ik luister...' : 'Tik op de knop en spreek je oefening in'}</span>}
          </div>
        </div>

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
                {EXERCISES.filter((e) => e.category === cat).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Sets
            <input
              type="number"
              min={1}
              value={sets}
              onChange={(e) => setSets(Number(e.target.value))}
              className="mt-1 w-full rounded-lg px-2 py-2 text-sm"
              style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </label>
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Reps
            <input
              type="number"
              min={0}
              value={reps}
              onChange={(e) => setReps(Number(e.target.value))}
              className="mt-1 w-full rounded-lg px-2 py-2 text-sm"
              style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </label>
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Kg
            <input
              type="number"
              min={0}
              step={0.5}
              value={weight}
              disabled={bodyweight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="mt-1 w-full rounded-lg px-2 py-2 text-sm disabled:opacity-40"
              style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </label>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={bodyweight} onChange={(e) => setBodyweight(e.target.checked)} />
          Eigen lichaamsgewicht
        </label>

        <label className="mt-3 block text-sm" style={{ color: 'var(--text-secondary)' }}>
          Notitie (optioneel)
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          />
        </label>

        <button
          type="button"
          onClick={handleSave}
          className="mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-white"
          style={{ background: 'var(--series-push)' }}
        >
          Opslaan
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
            const exercise = findExerciseById(log.exerciseId)
            return (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {exercise?.name ?? log.exerciseId}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDateTime(log.date)} · {log.sets.length} sets × {log.sets[0]?.reps ?? 0} reps
                    {log.sets[0]?.weight ? ` × ${log.sets[0].weight}kg` : ' (eigen gewicht)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteLog(log.id)}
                  className="text-xs"
                  style={{ color: 'var(--status-critical)' }}
                  aria-label="Verwijderen"
                >
                  Verwijderen
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

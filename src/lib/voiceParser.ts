import type { Exercise } from '../data/exercises'
import { convertDutchNumberWordsToDigits, normalizeDutchText } from './dutchNumbers'
import { getAllExercises } from './exerciseCatalog'

export interface ParsedWorkout {
  exercise: Exercise | null
  sets: number | null
  reps: number | null
  weight: number | null
  bodyweight: boolean
  /** De tekst na normalisatie/telwoord-conversie, handig om te tonen ter controle */
  processedText: string
}

function matchExercise(normalizedText: string): Exercise | null {
  let best: { exercise: Exercise; aliasLength: number } | null = null
  for (const exercise of getAllExercises()) {
    for (const alias of exercise.aliases) {
      const normalizedAlias = normalizeDutchText(alias)
      if (normalizedAlias.length === 0) continue
      if (normalizedText.includes(normalizedAlias)) {
        if (!best || normalizedAlias.length > best.aliasLength) {
          best = { exercise, aliasLength: normalizedAlias.length }
        }
      }
    }
  }
  return best?.exercise ?? null
}

function firstMatchNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const value = parseFloat(match[1].replace(',', '.'))
      if (!Number.isNaN(value)) return value
    }
  }
  return null
}

/**
 * Parseert een gesproken of getypte zin naar een gestructureerde workout-log.
 * Ondersteunt o.a.:
 *  - "Bankdrukken drie sets van tien herhalingen met vijftig kilo"
 *  - "Squat 4 sets 8 reps 80 kg"
 *  - "Pull-ups 3x8 met eigen gewicht"
 */
export function parseWorkoutText(rawText: string): ParsedWorkout {
  const withDigits = convertDutchNumberWordsToDigits(rawText)

  const exercise = matchExercise(withDigits)

  const bodyweight = /eigen\s?gewicht|lichaamsgewicht|bodyweight/.test(withDigits)

  let sets = firstMatchNumber(withDigits, [
    /(\d+(?:[.,]\d+)?)\s*(?:sets?|setjes|series)\b/,
    /(\d+(?:[.,]\d+)?)\s*x\s*\d+/, // "3x10" -> eerste getal is sets
  ])

  let reps = firstMatchNumber(withDigits, [
    /(?:sets?|setjes|series)\s*van\s*(\d+(?:[.,]\d+)?)/,
    /(\d+(?:[.,]\d+)?)\s*(?:reps?|herhalingen|keer)\b/,
    /\d+(?:[.,]\d+)?\s*x\s*(\d+(?:[.,]\d+)?)/, // "3x10" -> tweede getal is reps
  ])

  const weight = bodyweight
    ? 0
    : firstMatchNumber(withDigits, [/(\d+(?:[.,]\d+)?)\s*(?:kilo'?s?|kg)\b/])

  // Fallback: als er maar één los getal in de tekst staat en geen sets/reps
  // herkend zijn, behandel dat als reps (meest voorkomende korte invoer).
  if (sets === null && reps === null) {
    const lone = withDigits.match(/\b(\d+(?:[.,]\d+)?)\b/)
    if (lone) reps = parseFloat(lone[1].replace(',', '.'))
  }

  return {
    exercise,
    sets: sets !== null ? Math.round(sets) : null,
    reps: reps !== null ? Math.round(reps) : null,
    weight: weight !== null ? weight : null,
    bodyweight,
    processedText: withDigits,
  }
}

// ---------- Web Speech API ----------

type SpeechRecognitionCtor = new () => SpeechRecognition

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null
}

export interface VoiceListenOptions {
  onResult: (transcript: string, isFinal: boolean) => void
  onError: (message: string) => void
  onEnd: () => void
  lang?: string
}

export interface VoiceListenHandle {
  stop: () => void
}

/** Start live spraakherkenning (Nederlands) via de browser. Retourneert een stop-functie. */
export function startVoiceListening(options: VoiceListenOptions): VoiceListenHandle | null {
  const Ctor = getSpeechRecognitionCtor()
  if (!Ctor) {
    options.onError('Spraakherkenning wordt niet ondersteund in deze browser. Gebruik Chrome, of typ je oefening in.')
    return null
  }

  const recognition = new Ctor()
  recognition.lang = options.lang ?? 'nl-NL'
  recognition.continuous = false
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let transcript = ''
    let isFinal = false
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      transcript += result[0].transcript
      if (result.isFinal) isFinal = true
    }
    options.onResult(transcript, isFinal)
  }

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    const messages: Record<string, string> = {
      'no-speech': 'Geen spraak gedetecteerd. Probeer het opnieuw.',
      'not-allowed': 'Microfoon-toegang is geweigerd. Sta toegang toe in je browserinstellingen.',
      'audio-capture': 'Geen microfoon gevonden.',
    }
    options.onError(messages[event.error] ?? `Spraakherkenning fout: ${event.error}`)
  }

  recognition.onend = () => options.onEnd()

  recognition.start()

  return { stop: () => recognition.stop() }
}

import { useState } from 'react'
import { CATEGORY_LABELS, MUSCLE_LABELS, type ExerciseCategory, type MuscleGroup } from '../data/exercises'
import { addCustomExercise } from '../lib/exerciseCatalog'

const CATEGORIES: ExerciseCategory[] = ['push', 'pull', 'legs', 'core']
const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[]
const NONE = '__none__'

export function AddExerciseForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ExerciseCategory>('push')
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>('chest')
  const [secondaryMuscle, setSecondaryMuscle] = useState<string>(NONE)
  const [aliasesText, setAliasesText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (!name.trim()) {
      setError('Geef de oefening een naam.')
      return
    }
    const muscles: Partial<Record<MuscleGroup, number>> = { [primaryMuscle]: 1 }
    if (secondaryMuscle !== NONE) muscles[secondaryMuscle as MuscleGroup] = 0.4

    const aliases = aliasesText
      .split(/[,\n]/)
      .map((a) => a.trim())
      .filter(Boolean)

    addCustomExercise({ name, category, muscles, aliases })
    onCreated()
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        Nieuwe eigen oefening
      </h2>

      {error && (
        <p className="mt-2 text-xs" style={{ color: 'var(--status-critical)' }}>
          {error}
        </p>
      )}

      <label className="mt-3 block text-sm" style={{ color: 'var(--text-secondary)' }}>
        Naam
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bijv. Home band pulldown"
          className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        />
      </label>

      <label className="mt-3 block text-sm" style={{ color: 'var(--text-secondary)' }}>
        Categorie
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
          className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Primaire spiergroep
          <select
            value={primaryMuscle}
            onChange={(e) => setPrimaryMuscle(e.target.value as MuscleGroup)}
            className="mt-1 w-full rounded-lg px-2 py-2 text-sm"
            style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            {MUSCLES.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Secundair (optioneel)
          <select
            value={secondaryMuscle}
            onChange={(e) => setSecondaryMuscle(e.target.value)}
            className="mt-1 w-full rounded-lg px-2 py-2 text-sm"
            style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            <option value={NONE}>Geen</option>
            {MUSCLES.filter((m) => m !== primaryMuscle).map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block text-sm" style={{ color: 'var(--text-secondary)' }}>
        Alternatieve namen (optioneel, komma-gescheiden)
        <textarea
          value={aliasesText}
          onChange={(e) => setAliasesText(e.target.value)}
          placeholder="Bijv. band pulldown, elastiek lat pulldown"
          rows={2}
          className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        />
        <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
          Gebruikt bij inspreken en bij het importeren van CSV-bestanden.
        </span>
      </label>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg py-2 text-sm font-medium"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          Annuleren
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 rounded-lg py-2 text-sm font-medium text-white"
          style={{ background: 'var(--series-push)' }}
        >
          Toevoegen
        </button>
      </div>
    </div>
  )
}

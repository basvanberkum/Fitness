import { EXERCISES, type Exercise, type ExerciseCategory, type MuscleGroup } from '../data/exercises'

const STORAGE_KEY = 'fitness-tracker:custom-exercises:v1'
const EVENT_NAME = 'fitness-tracker:custom-exercises-changed'

function readCustomRaw(): Exercise[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCustomRaw(exercises: Exercise[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function getCustomExercises(): Exercise[] {
  return readCustomRaw()
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface NewCustomExercise {
  name: string
  category: ExerciseCategory
  muscles: Partial<Record<MuscleGroup, number>>
  aliases: string[]
}

/** Voegt een eigen oefening toe. Retourneert de aangemaakte oefening. */
export function addCustomExercise(input: NewCustomExercise): Exercise {
  const existing = readCustomRaw()
  const baseSlug = slugify(input.name) || 'oefening'
  let id = `custom-${baseSlug}`
  let n = 2
  const allIds = new Set([...EXERCISES.map((e) => e.id), ...existing.map((e) => e.id)])
  while (allIds.has(id)) {
    id = `custom-${baseSlug}-${n}`
    n++
  }

  const exercise: Exercise = {
    id,
    name: input.name.trim(),
    category: input.category,
    muscles: input.muscles,
    aliases: input.aliases.map((a) => a.trim()).filter(Boolean),
  }
  writeCustomRaw([...existing, exercise])
  return exercise
}

export function updateCustomExercise(id: string, updates: Partial<NewCustomExercise>) {
  const existing = readCustomRaw()
  writeCustomRaw(existing.map((e) => (e.id === id ? { ...e, ...updates } : e)))
}

export function deleteCustomExercise(id: string) {
  const existing = readCustomRaw()
  writeCustomRaw(existing.filter((e) => e.id !== id))
}

export function isCustomExerciseId(id: string): boolean {
  return id.startsWith('custom-')
}

/** Ingebouwde + eigen oefeningen samen, in één lijst. */
export function getAllExercises(): Exercise[] {
  return [...EXERCISES, ...readCustomRaw()]
}

export function findExercise(id: string): Exercise | undefined {
  return getAllExercises().find((e) => e.id === id)
}

export const CUSTOM_EXERCISES_EVENT = EVENT_NAME

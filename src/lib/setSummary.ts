import type { SetEntry } from './storage'

/**
 * Korte samenvatting van een reeks sets. Laat reps/gewicht alleen zien als die
 * voor alle sets gelijk zijn — bij pyramide- of dropsets (verschillende reps/gewicht
 * per set) zou dat anders een niet-kloppend "X sets × Y reps × Z kg" suggereren,
 * terwijl er dan alleen een betrouwbaar aantal sets te geven is.
 */
export function summarizeSets(sets: SetEntry[]): string {
  const count = sets.length
  const label = `${count} set${count === 1 ? '' : 's'}`
  if (count === 0) return label

  const [first] = sets
  const uniform = sets.every((s) => s.reps === first.reps && s.weight === first.weight)
  if (!uniform) return label

  const weightPart = first.weight > 0 ? ` × ${first.weight}kg` : ' (eigen gewicht)'
  return `${label} × ${first.reps} reps${weightPart}`
}

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

  const isCardio = sets.every(
    (s) => s.reps === 0 && s.weight === 0 && (s.durationMinutes != null || s.distanceKm != null),
  )
  if (isCardio) {
    const totalDuration = sets.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)
    const totalDistance = Math.round(sets.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0) * 100) / 100
    const parts: string[] = []
    if (totalDuration > 0) parts.push(`${totalDuration} min`)
    if (totalDistance > 0) parts.push(`${totalDistance} km`)
    return parts.length > 0 ? parts.join(' · ') : label
  }

  const [first] = sets
  const uniform = sets.every((s) => s.reps === first.reps && s.weight === first.weight && !!s.bodyweight === !!first.bodyweight)
  if (!uniform) return label

  let weightPart: string
  if (first.bodyweight) weightPart = first.weight > 0 ? ` (eigen gewicht + ${first.weight}kg)` : ' (eigen gewicht)'
  else weightPart = first.weight > 0 ? ` × ${first.weight}kg` : ' (eigen gewicht)'
  return `${label} × ${first.reps} reps${weightPart}`
}

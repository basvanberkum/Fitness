import type { MuscleGroup } from '../data/exercises'
import { findExercise } from './exerciseCatalog'
import type { DayGroup } from './history'
import type { LogEntry } from './storage'
import { getEffectiveTargets } from './targets'

export interface SessionQualityScore {
  overall: number
  goalAlignment: number
  recovery: number
  structure: number
  structureBasis: 'duration' | 'variety'
  notes: string[]
}

function muscleSetsForEntry(entry: LogEntry): Partial<Record<MuscleGroup, number>> {
  const exercise = findExercise(entry.exerciseId)
  if (!exercise) return {}
  const setCount = entry.sets.length
  const result: Partial<Record<MuscleGroup, number>> = {}
  for (const [muscle, weight] of Object.entries(exercise.muscles) as [MuscleGroup, number][]) {
    result[muscle] = (result[muscle] ?? 0) + setCount * weight
  }
  return result
}

function aggregateMuscleSets(entries: LogEntry[]): Partial<Record<MuscleGroup, number>> {
  const totals: Partial<Record<MuscleGroup, number>> = {}
  for (const entry of entries) {
    for (const [muscle, sets] of Object.entries(muscleSetsForEntry(entry)) as [MuscleGroup, number][]) {
      totals[muscle] = (totals[muscle] ?? 0) + sets
    }
  }
  return totals
}

/**
 * Schat hoe goed een trainingssessie scoort (0-10) op drie punten:
 * 1. Doelbijdrage: trainde je vooral spiergroepen die nog achterliepen op je eigen
 *    doel (gebaseerd op de 7 dagen vóór deze sessie), of vooral spiergroepen die al
 *    ruim op schema zaten?
 * 2. Herstel: zat er voor de getrainde spiergroepen minimaal ~48 uur tussen deze en
 *    de vorige keer dat je die spiergroep trainde? (Dit is een veelgebruikte
 *    vuistregel voor herstel, geen voor jou geverifieerd medisch gegeven.)
 * 3. Opbouw/tempo: alleen te berekenen op basis van sets-per-uur als de sessieduur
 *    bekend is (bijv. uit een CSV-import met start- én eindtijd); anders een grove
 *    inschatting op basis van hoeveel verschillende oefeningen en sets per oefening
 *    je deed.
 *
 * Dit is een heuristische inschatting op basis van vuistregels, geen gevalideerd
 * trainingsadvies — gebruik het als richting, niet als absolute waarheid.
 */
export function computeSessionQualityScore(session: DayGroup, allLogs: LogEntry[]): SessionQualityScore {
  const targets = getEffectiveTargets()
  const sessionDate = new Date(Math.min(...session.entries.map((e) => new Date(e.date).getTime())))
  const sessionMuscleSets = aggregateMuscleSets(session.entries)
  const muscles = Object.keys(sessionMuscleSets) as MuscleGroup[]
  const totalWeight = muscles.reduce((sum, m) => sum + (sessionMuscleSets[m] ?? 0), 0) || 1

  const priorLogs = allLogs.filter((l) => new Date(l.date) < sessionDate)

  // --- 1. Doelbijdrage ---
  let goalScoreSum = 0
  for (const muscle of muscles) {
    const weight = sessionMuscleSets[muscle] ?? 0
    const sevenDaysBefore = new Date(sessionDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    const preSets = priorLogs
      .filter((l) => new Date(l.date) >= sevenDaysBefore)
      .reduce((sum, l) => {
        const ex = findExercise(l.exerciseId)
        const w = ex?.muscles[muscle] ?? 0
        return sum + l.sets.length * w
      }, 0)
    const target = targets[muscle]
    let subScore: number
    if (preSets >= target.max) subScore = 4
    else if (preSets >= target.min) subScore = 7
    else subScore = 10
    goalScoreSum += subScore * weight
  }
  const goalAlignment = Math.round((goalScoreSum / totalWeight) * 10) / 10

  // --- 2. Herstel ---
  let recoveryScoreSum = 0
  for (const muscle of muscles) {
    const weight = sessionMuscleSets[muscle] ?? 0
    let lastTime: number | null = null
    for (const l of priorLogs) {
      const ex = findExercise(l.exerciseId)
      if (!ex || !ex.muscles[muscle]) continue
      const t = new Date(l.date).getTime()
      if (lastTime === null || t > lastTime) lastTime = t
    }
    let subScore: number
    if (lastTime === null) {
      subScore = 10
    } else {
      const gapHours = (sessionDate.getTime() - lastTime) / (1000 * 60 * 60)
      subScore = Math.max(0, Math.min(10, (gapHours / 48) * 10))
    }
    recoveryScoreSum += subScore * weight
  }
  const recovery = Math.round((recoveryScoreSum / totalWeight) * 10) / 10

  // --- 3. Opbouw/tempo ---
  const durations = session.entries.map((e) => e.durationMinutes).filter((d): d is number => !!d && d > 0)
  let structure: number
  let structureBasis: 'duration' | 'variety'
  if (durations.length > 0) {
    const duration = Math.max(...durations)
    const setsPerHour = session.totalSets / (duration / 60)
    if (setsPerHour >= 10 && setsPerHour <= 20) structure = 10
    else if (setsPerHour > 20) structure = Math.max(3, 10 - (setsPerHour - 20) * 0.3)
    else structure = Math.max(3, 10 - (10 - setsPerHour) * 0.5)
    structureBasis = 'duration'
  } else {
    const distinctExercises = new Set(session.entries.map((e) => e.exerciseId)).size
    const avgSetsPerExercise = session.totalSets / Math.max(1, distinctExercises)
    let varietyScore = 10
    if (distinctExercises < 2) varietyScore -= 3
    if (avgSetsPerExercise < 2 || avgSetsPerExercise > 6) varietyScore -= 3
    structure = Math.max(0, Math.min(10, varietyScore))
    structureBasis = 'variety'
  }
  structure = Math.round(structure * 10) / 10

  const overall = Math.round((goalAlignment * 0.4 + recovery * 0.35 + structure * 0.25) * 10) / 10

  const notes: string[] = []
  if (goalAlignment >= 8) notes.push('Vooral spiergroepen getraind die nog achterliepen op je doel.')
  else if (goalAlignment <= 5) notes.push('Vooral spiergroepen getraind die al ruim op schema zaten.')
  if (recovery <= 5) notes.push('Minder dan ~48u rust sinds de vorige keer voor (een deel van) deze spiergroepen.')
  if (structureBasis === 'variety') {
    notes.push('Sessieduur onbekend — inschatting op basis van opbouw i.p.v. tempo (geen CSV-eindtijd geïmporteerd).')
  }

  return { overall, goalAlignment, recovery, structure, structureBasis, notes }
}

export function qualityScoreColor(overall: number): string {
  if (overall >= 8) return 'var(--status-good)'
  if (overall >= 5) return 'var(--status-warning)'
  return 'var(--status-critical)'
}

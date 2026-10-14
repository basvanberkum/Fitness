import { getEffectiveCardioTarget } from './cardioTargets'
import type { Exercise, MuscleGroup } from '../data/exercises'
import { findExercise } from './exerciseCatalog'
import type { DayGroup } from './history'
import type { LogEntry } from './storage'
import { getEffectiveTargets } from './targets'

export interface StrengthSessionQualityScore {
  kind: 'strength'
  overall: number
  goalAlignment: number
  recovery: number
  tempo: number
  exerciseChoice: number
  notes: string[]
}

export interface CardioSessionQualityScore {
  kind: 'cardio'
  overall: number
  cardioGoalContribution: number
  notes: string[]
}

/** Sessie die volledig uit lichte cardio (wandelen) bestaat — daar houden we bewust geen
 * doel voor bij, dus is er ook geen zinnige trainingskwaliteit-score te geven. */
export interface UntrackedSessionQualityScore {
  kind: 'untracked'
  notes: string[]
}

export type SessionQualityScore = StrengthSessionQualityScore | CardioSessionQualityScore | UntrackedSessionQualityScore

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

/** Een oefening die minstens 2 spiergroepen aanspreekt met een stevig totaalgewicht —
 * een grove, geen officiële definitie van "compound" (bijv. Bench Press, Barbell Row). */
function isCompoundExercise(exercise: Exercise): boolean {
  const weights = Object.values(exercise.muscles) as number[]
  const weightSum = weights.reduce((sum, w) => sum + w, 0)
  return weights.length >= 2 && weightSum >= 1.2
}

function primaryMuscleOf(exercise: Exercise): MuscleGroup | null {
  let best: MuscleGroup | null = null
  let bestWeight = -1
  for (const [muscle, weight] of Object.entries(exercise.muscles) as [MuscleGroup, number][]) {
    if (weight > bestWeight) {
      bestWeight = weight
      best = muscle
    }
  }
  return best
}

/**
 * Schat hoe goed een trainingssessie scoort (0-10) op vier punten. Gewogen op basis van
 * jouw eigen prioriteiten:
 * 1. Doelbijdrage (30%): trainde je vooral spiergroepen die nog achterliepen op je eigen
 *    doel (gebaseerd op de 7 dagen vóór deze sessie), of vooral spiergroepen die al ruim
 *    op schema zaten?
 * 2. Herstel (25%): zat er voor de getrainde spiergroepen minimaal ~48 uur tussen deze
 *    en de vorige keer dat je die spiergroep trainde? (Veelgebruikte vuistregel, geen
 *    voor jou geverifieerd medisch gegeven.)
 * 3. Tempo/intensiteit (25%): uitsluitend op basis van het totaal aantal sets in de sessie
 *    (ongeacht of de sessieduur bekend is): <3 → 3, 3-6 → 5, 7-9 → 7, 10-12 → 8, 13-15 → 9,
 *    ≥16 → 10.
 * 4. Slimme oefeningkeuze (20%): zat er voor elke getrainde spiergroep minstens één
 *    compound-oefening bij (i.p.v. alleen isolatie), en werd er niet veel tijd besteed
 *    aan meerdere bijna-identieke oefeningen voor dezelfde spier? Dit is verreweg de
 *    meest subjectieve van de vier — een pure isolatie-sessie is niet per se dom (bijv.
 *    een gerichte armdag), dus die krijgt een neutrale score; vooral veel overlappende
 *    oefeningen voor één spier trekt hem omlaag.
 *
 * Dit is een heuristische inschatting op basis van vuistregels, geen gevalideerd
 * trainingsadvies — gebruik het als richting, niet als absolute waarheid.
 *
 * Geldt alleen voor kracht-/isolatiesessies. Een sessie die volledig uit cardio-oefeningen
 * bestaat (hardlopen, fietsen, ...) krijgt een heel andere score — zie
 * `computeCardioSessionQualityScore` — omdat deze vier criteria daar simpelweg niet op slaan.
 */
function computeStrengthSessionQualityScore(session: DayGroup, allLogs: LogEntry[]): StrengthSessionQualityScore {
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
    if (preSets >= target.max) subScore = 2
    else if (preSets >= target.min) subScore = 6
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

  // --- 3. Tempo/intensiteit --- uitsluitend op basis van totaal aantal sets in de sessie.
  const totalSets = session.totalSets
  let tempo: number
  if (totalSets < 3) tempo = 3
  else if (totalSets <= 6) tempo = 5
  else if (totalSets <= 9) tempo = 7
  else if (totalSets <= 12) tempo = 8
  else if (totalSets <= 15) tempo = 9
  else tempo = 10 // 16+

  // --- 4. Slimme oefeningkeuze ---
  let coveredWeight = 0
  for (const muscle of muscles) {
    const hasCompound = session.entries.some((e) => {
      const ex = findExercise(e.exerciseId)
      return !!ex && (ex.muscles[muscle] ?? 0) > 0 && isCompoundExercise(ex)
    })
    if (hasCompound) coveredWeight += sessionMuscleSets[muscle] ?? 0
  }
  const compoundCoverage = coveredWeight / totalWeight

  const exercisesByPrimaryMuscle = new Map<MuscleGroup, Set<string>>()
  for (const entry of session.entries) {
    const exercise = findExercise(entry.exerciseId)
    if (!exercise) continue
    const primary = primaryMuscleOf(exercise)
    if (!primary) continue
    if (!exercisesByPrimaryMuscle.has(primary)) exercisesByPrimaryMuscle.set(primary, new Set())
    exercisesByPrimaryMuscle.get(primary)?.add(exercise.id)
  }
  const maxDistinctForOneMuscle = Math.max(0, ...[...exercisesByPrimaryMuscle.values()].map((s) => s.size))
  let redundancyPenalty = 0
  if (maxDistinctForOneMuscle >= 4) redundancyPenalty = 4
  else if (maxDistinctForOneMuscle === 3) redundancyPenalty = 2

  // Baseline van 5 (neutraal — puur isolatiewerk is niet per se een slechte keuze),
  // oplopend tot 10 bij volledige compound-dekking, verlaagd bij veel overlappende
  // oefeningen voor dezelfde spier.
  const exerciseChoice = Math.round(Math.max(0, Math.min(10, 5 + compoundCoverage * 5 - redundancyPenalty)) * 10) / 10

  // Een gewogen gemiddelde alleen verdunt een zwakke dimensie zodra de andere drie goed
  // zijn — vier onafhankelijke dimensies middelen al snel naar een hoog eindcijfer, ook
  // als er één duidelijk uit de pas loopt. Daarom telt de zwakste dimensie extra mee: het
  // eindcijfer kan nooit hoger zijn dan die zwakste score + 2.
  const weightedAverage = goalAlignment * 0.3 + recovery * 0.25 + tempo * 0.25 + exerciseChoice * 0.2
  const weakestDimension = Math.min(goalAlignment, recovery, tempo, exerciseChoice)
  const overall = Math.round(Math.min(weightedAverage, weakestDimension + 2) * 10) / 10

  const notes: string[] = []
  if (goalAlignment >= 8) notes.push('Vooral spiergroepen getraind die nog achterliepen op je doel.')
  else if (goalAlignment <= 4) notes.push('Vooral spiergroepen getraind die al ruim op schema of over je doel zaten.')
  if (recovery <= 5) notes.push('Minder dan ~48u rust sinds de vorige keer voor (een deel van) deze spiergroepen.')
  if (maxDistinctForOneMuscle >= 3) {
    notes.push(`${maxDistinctForOneMuscle} verschillende oefeningen voor dezelfde hoofdspier — mogelijk wat overlappend.`)
  } else if (compoundCoverage < 0.5 && muscles.length > 0) {
    notes.push('Vooral isolatie-oefeningen, geen compound-oefening per getrainde spiergroep — niet per se slecht, wel minder tijdsefficiënt.')
  }

  return { kind: 'strength', overall, goalAlignment, recovery, tempo, exerciseChoice, notes }
}

/**
 * Score (0-10) voor een sessie die (deels) uit intensieve cardio-oefeningen bestaat. De vier
 * kracht-criteria (doelbijdrage per spiergroep, 48u-herstel, sets/uur-tempo, compound-keuze)
 * gaan hier niet op — in plaats daarvan telt maar één ding: droeg deze sessie bij aan je nog
 * niet gehaalde wekelijkse cardio-doel, of was dat doel deze week al gehaald? Zelfde
 * "nog nodig?"-logica als Doelbijdrage bij kracht, maar dan op cardio-minuten i.p.v.
 * kracht-sets per spiergroep. Minuten lichte cardio (wandelen) tellen hier niet in mee —
 * daar houden we bewust geen doel voor bij.
 */
function computeCardioSessionQualityScore(session: DayGroup, allLogs: LogEntry[]): CardioSessionQualityScore {
  const target = getEffectiveCardioTarget()
  const sessionDate = new Date(Math.min(...session.entries.map((e) => new Date(e.date).getTime())))
  const sevenDaysBefore = new Date(sessionDate.getTime() - 7 * 24 * 60 * 60 * 1000)
  const priorLogs = allLogs.filter((l) => new Date(l.date) < sessionDate)

  const preMinutes = priorLogs
    .filter((l) => new Date(l.date) >= sevenDaysBefore)
    .reduce((sum, l) => {
      const ex = findExercise(l.exerciseId)
      if (!ex || ex.category !== 'cardio' || (ex.cardioIntensity ?? 'intensive') !== 'intensive') return sum
      return sum + l.sets.reduce((s, set) => s + (set.durationMinutes ?? 0), 0)
    }, 0)

  let cardioGoalContribution: number
  if (preMinutes >= target.minutesPerWeek * 1.5) cardioGoalContribution = 2
  else if (preMinutes >= target.minutesPerWeek) cardioGoalContribution = 6
  else cardioGoalContribution = 10

  const overall = cardioGoalContribution

  const notes: string[] = []
  if (cardioGoalContribution >= 8) {
    notes.push('Je wekelijkse cardio-doel was nog niet gehaald — deze sessie hielp daarbij.')
  } else if (cardioGoalContribution <= 4) {
    notes.push('Je wekelijkse cardio-doel was al gehaald — nog steeds goed voor je conditie, maar minder noodzakelijk voor dit doel.')
  }
  notes.push('Dit is een cardio-sessie: hier gelden andere criteria dan bij kracht training (geen doelbijdrage per spiergroep, herstel, tempo of oefeningkeuze).')

  return { kind: 'cardio', overall, cardioGoalContribution, notes }
}

/** Kiest op basis van de oefeningen in de sessie welk scoremodel van toepassing is. */
export function computeSessionQualityScore(session: DayGroup, allLogs: LogEntry[]): SessionQualityScore {
  const allCardio =
    session.entries.length > 0 && session.entries.every((e) => findExercise(e.exerciseId)?.category === 'cardio')
  if (allCardio) {
    const hasIntensiveMinutes = session.entries.some((e) => {
      const ex = findExercise(e.exerciseId)
      return (ex?.cardioIntensity ?? 'intensive') === 'intensive' && e.sets.some((s) => (s.durationMinutes ?? 0) > 0)
    })
    if (!hasIntensiveMinutes) {
      return {
        kind: 'untracked',
        notes: ['Voor wandelen/lichte cardio houden we bewust geen wekelijks doel bij — deze sessie krijgt daarom geen trainingskwaliteit-score.'],
      }
    }
    return computeCardioSessionQualityScore(session, allLogs)
  }
  return computeStrengthSessionQualityScore(session, allLogs)
}

export function qualityScoreColor(overall: number): string {
  if (overall >= 8) return 'var(--status-good)'
  if (overall >= 5) return 'var(--status-warning)'
  return 'var(--status-critical)'
}

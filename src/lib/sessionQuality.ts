import { CARDIO_INTENSITY_LABELS, getEffectiveCardioTargets } from './cardioTargets'
import type { CardioIntensity, Exercise, MuscleGroup } from '../data/exercises'
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
  /** De dominante intensiteit in deze sessie (op basis van meeste minuten), voor label-doeleinden. */
  intensity: CardioIntensity
  cardioGoalContribution: number
  notes: string[]
}

export type SessionQualityScore = StrengthSessionQualityScore | CardioSessionQualityScore

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
 *    (ongeacht of de sessieduur bekend is): <6 onvoldoende, 6-9 zwak, 9-12 ok, 12-15 goed,
 *    >15 uitstekend.
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
  if (totalSets < 6) tempo = 2 // onvoldoende
  else if (totalSets < 9) tempo = 4 // zwak
  else if (totalSets < 12) tempo = 6 // ok
  else if (totalSets < 15) tempo = 8 // goed
  else tempo = 10 // uitstekend

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
 * Score (0-10) voor een sessie die volledig uit cardio-oefeningen bestaat. De vier
 * kracht-criteria (doelbijdrage per spiergroep, 48u-herstel, sets/uur-tempo, compound-keuze)
 * gaan hier niet op — in plaats daarvan telt maar één ding: droeg deze sessie bij aan je nog
 * niet gehaalde wekelijkse cardio-doel (intensief resp. licht/wandelen), of was dat doel deze
 * week al gehaald? Zelfde "nog nodig?"-logica als Doelbijdrage bij kracht, maar dan op
 * cardio-minuten i.p.v. kracht-sets per spiergroep.
 */
function computeCardioSessionQualityScore(session: DayGroup, allLogs: LogEntry[]): CardioSessionQualityScore {
  const targets = getEffectiveCardioTargets()
  const sessionDate = new Date(Math.min(...session.entries.map((e) => new Date(e.date).getTime())))
  const sevenDaysBefore = new Date(sessionDate.getTime() - 7 * 24 * 60 * 60 * 1000)
  const priorLogs = allLogs.filter((l) => new Date(l.date) < sessionDate)

  const minutesByIntensity: Partial<Record<CardioIntensity, number>> = {}
  for (const entry of session.entries) {
    const exercise = findExercise(entry.exerciseId)
    if (!exercise) continue
    const intensity = exercise.cardioIntensity ?? 'intensive'
    const minutes = entry.sets.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)
    minutesByIntensity[intensity] = (minutesByIntensity[intensity] ?? 0) + minutes
  }

  const totalMinutes = Object.values(minutesByIntensity).reduce((sum: number, m) => sum + (m ?? 0), 0) || 1

  let scoreSum = 0
  let dominantIntensity: CardioIntensity = 'intensive'
  let dominantMinutes = -1
  for (const [intensity, minutes] of Object.entries(minutesByIntensity) as [CardioIntensity, number][]) {
    if (minutes > dominantMinutes) {
      dominantMinutes = minutes
      dominantIntensity = intensity
    }
    const target = targets[intensity]
    const preMinutes = priorLogs
      .filter((l) => new Date(l.date) >= sevenDaysBefore)
      .reduce((sum, l) => {
        const ex = findExercise(l.exerciseId)
        if (!ex || (ex.cardioIntensity ?? 'intensive') !== intensity || ex.category !== 'cardio') return sum
        return sum + l.sets.reduce((s, set) => s + (set.durationMinutes ?? 0), 0)
      }, 0)
    let subScore: number
    if (preMinutes >= target.minutesPerWeek * 1.5) subScore = 2
    else if (preMinutes >= target.minutesPerWeek) subScore = 6
    else subScore = 10
    scoreSum += subScore * minutes
  }
  const cardioGoalContribution = Math.round((scoreSum / totalMinutes) * 10) / 10
  const overall = cardioGoalContribution

  const notes: string[] = []
  const intensityLabel = CARDIO_INTENSITY_LABELS[dominantIntensity]
  if (cardioGoalContribution >= 8) {
    notes.push(`Je wekelijkse cardio-doel voor ${intensityLabel.toLowerCase()} was nog niet gehaald — deze sessie hielp daarbij.`)
  } else if (cardioGoalContribution <= 4) {
    notes.push(`Je wekelijkse cardio-doel voor ${intensityLabel.toLowerCase()} was al gehaald — nog steeds goed voor je conditie, maar minder noodzakelijk voor dit doel.`)
  }
  notes.push('Dit is een cardio-sessie: hier gelden andere criteria dan bij kracht training (geen doelbijdrage per spiergroep, herstel, tempo of oefeningkeuze).')

  return { kind: 'cardio', overall, intensity: dominantIntensity, cardioGoalContribution, notes }
}

/** Kiest op basis van de oefeningen in de sessie welk scoremodel van toepassing is. */
export function computeSessionQualityScore(session: DayGroup, allLogs: LogEntry[]): SessionQualityScore {
  const allCardio =
    session.entries.length > 0 && session.entries.every((e) => findExercise(e.exerciseId)?.category === 'cardio')
  if (allCardio) return computeCardioSessionQualityScore(session, allLogs)
  return computeStrengthSessionQualityScore(session, allLogs)
}

export function qualityScoreColor(overall: number): string {
  if (overall >= 8) return 'var(--status-good)'
  if (overall >= 5) return 'var(--status-warning)'
  return 'var(--status-critical)'
}

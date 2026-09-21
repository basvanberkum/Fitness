export type MuscleGroup =
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'back'
  | 'biceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'

export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core'

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Borst',
  shoulders: 'Schouders',
  triceps: 'Triceps',
  back: 'Rug',
  biceps: 'Biceps',
  quads: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Bilspieren',
  calves: 'Kuiten',
  core: 'Buik / Core',
}

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Core',
}

export interface Exercise {
  id: string
  name: string
  category: ExerciseCategory
  /** Relatieve belasting per spiergroep (1 = volledig primair, <1 = secundair) */
  muscles: Partial<Record<MuscleGroup, number>>
  /** Alternatieve namen/uitspraakvarianten voor spraak- en tekstherkenning (NL) */
  aliases: string[]
}

export const EXERCISES: Exercise[] = [
  // ---------- PUSH ----------
  {
    id: 'bench-press',
    name: 'Bankdrukken',
    category: 'push',
    muscles: { chest: 1, triceps: 0.5, shoulders: 0.3 },
    aliases: ['bankdrukken', 'bench press', 'platte bankdrukken'],
  },
  {
    id: 'incline-bench-press',
    name: 'Schuine bankdrukken',
    category: 'push',
    muscles: { chest: 1, shoulders: 0.5, triceps: 0.3 },
    aliases: ['schuine bankdrukken', 'incline bench press', 'incline bankdrukken', 'schuine bank'],
  },
  {
    id: 'dumbbell-bench-press',
    name: 'Dumbbell bankdrukken',
    category: 'push',
    muscles: { chest: 1, triceps: 0.5, shoulders: 0.3 },
    aliases: ['dumbbell bankdrukken', 'halter bankdrukken', 'dumbbell press'],
  },
  {
    id: 'push-up',
    name: 'Push-ups',
    category: 'push',
    muscles: { chest: 1, triceps: 0.5, shoulders: 0.3, core: 0.2 },
    aliases: ['push-ups', 'push ups', 'opdrukken', 'opdrukoefening'],
  },
  {
    id: 'dips',
    name: 'Dips',
    category: 'push',
    muscles: { triceps: 1, chest: 0.5, shoulders: 0.3 },
    aliases: ['dips', 'triceps dips', 'borst dips'],
  },
  {
    id: 'overhead-press',
    name: 'Overhead press',
    category: 'push',
    muscles: { shoulders: 1, triceps: 0.5 },
    aliases: ['overhead press', 'militaire pers', 'schouderdrukken', 'shoulder press staand'],
  },
  {
    id: 'dumbbell-shoulder-press',
    name: 'Dumbbell shoulder press',
    category: 'push',
    muscles: { shoulders: 1, triceps: 0.4 },
    aliases: ['dumbbell shoulder press', 'halter schouderdrukken', 'dumbbell press schouders'],
  },
  {
    id: 'arnold-press',
    name: 'Arnold press',
    category: 'push',
    muscles: { shoulders: 1, triceps: 0.3 },
    aliases: ['arnold press'],
  },
  {
    id: 'lateral-raise',
    name: 'Lateral raise (zijheffen)',
    category: 'push',
    muscles: { shoulders: 1 },
    aliases: ['lateral raise', 'zijheffen', 'zij heffen'],
  },
  {
    id: 'front-raise',
    name: 'Front raise',
    category: 'push',
    muscles: { shoulders: 1 },
    aliases: ['front raise', 'voorheffen'],
  },
  {
    id: 'chest-fly',
    name: 'Chest fly',
    category: 'push',
    muscles: { chest: 1 },
    aliases: ['chest fly', 'vliegende beweging', 'flyes', 'peck deck'],
  },
  {
    id: 'cable-crossover',
    name: 'Cable crossover',
    category: 'push',
    muscles: { chest: 1 },
    aliases: ['cable crossover', 'kabel crossover'],
  },
  {
    id: 'triceps-pushdown',
    name: 'Triceps pushdown',
    category: 'push',
    muscles: { triceps: 1 },
    aliases: ['triceps pushdown', 'triceps kabel', 'pushdown', 'triceps extensie kabel'],
  },
  {
    id: 'skull-crusher',
    name: 'Skull crusher',
    category: 'push',
    muscles: { triceps: 1 },
    aliases: ['skull crusher', 'triceps extensie', 'french press'],
  },
  {
    id: 'close-grip-bench-press',
    name: 'Close grip bankdrukken',
    category: 'push',
    muscles: { triceps: 1, chest: 0.5 },
    aliases: ['close grip bankdrukken', 'smalle grip bankdrukken', 'close grip bench press'],
  },

  // ---------- PULL ----------
  {
    id: 'pull-up',
    name: 'Pull-ups (optrekken)',
    category: 'pull',
    muscles: { back: 1, biceps: 0.5 },
    aliases: ['pull-ups', 'pull ups', 'optrekken', 'optrekoefening'],
  },
  {
    id: 'chin-up',
    name: 'Chin-ups',
    category: 'pull',
    muscles: { back: 1, biceps: 0.6 },
    aliases: ['chin-ups', 'chin ups', 'optrekken onderhandse grip'],
  },
  {
    id: 'lat-pulldown',
    name: 'Lat pulldown',
    category: 'pull',
    muscles: { back: 1, biceps: 0.4 },
    aliases: ['lat pulldown', 'latissimus pulldown', 'lattrekken'],
  },
  {
    id: 'barbell-row',
    name: 'Rij halterstang (bent-over row)',
    category: 'pull',
    muscles: { back: 1, biceps: 0.4 },
    aliases: ['rij halterstang', 'bent over row', 'gebogen roeien', 'barbell row'],
  },
  {
    id: 'dumbbell-row',
    name: 'Rij dumbbell',
    category: 'pull',
    muscles: { back: 1, biceps: 0.4 },
    aliases: ['rij dumbbell', 'dumbbell row', 'halter roeien', 'one arm row'],
  },
  {
    id: 'seated-cable-row',
    name: 'Seated cable row',
    category: 'pull',
    muscles: { back: 1, biceps: 0.3 },
    aliases: ['seated cable row', 'roeien kabel', 'kabel roeien', 'zittend roeien'],
  },
  {
    id: 't-bar-row',
    name: 'T-bar row',
    category: 'pull',
    muscles: { back: 1, biceps: 0.3 },
    aliases: ['t-bar row', 't bar row'],
  },
  {
    id: 'face-pull',
    name: 'Face pull',
    category: 'pull',
    muscles: { shoulders: 0.5, back: 0.5 },
    aliases: ['face pull'],
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    category: 'pull',
    muscles: { back: 1, hamstrings: 0.6, glutes: 0.6 },
    aliases: ['deadlift', 'dodelift', 'heffen', 'kniebuiging met heffen'],
  },
  {
    id: 'shrugs',
    name: 'Shrugs (schouderophalen)',
    category: 'pull',
    muscles: { back: 1 },
    aliases: ['shrugs', 'schouderophalen', 'trapezius oefening'],
  },
  {
    id: 'biceps-curl',
    name: 'Bicepscurl',
    category: 'pull',
    muscles: { biceps: 1 },
    aliases: ['bicepscurl', 'biceps curl', 'halter curl', 'barbell curl'],
  },
  {
    id: 'hammer-curl',
    name: 'Hammer curl',
    category: 'pull',
    muscles: { biceps: 1 },
    aliases: ['hammer curl', 'hamercurl'],
  },
  {
    id: 'preacher-curl',
    name: 'Preacher curl',
    category: 'pull',
    muscles: { biceps: 1 },
    aliases: ['preacher curl', 'scott curl'],
  },
  {
    id: 'cable-curl',
    name: 'Cable curl',
    category: 'pull',
    muscles: { biceps: 1 },
    aliases: ['cable curl', 'kabel curl'],
  },

  // ---------- LEGS ----------
  {
    id: 'squat',
    name: 'Squat (kniebuiging)',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.6 },
    aliases: ['squat', 'squats', 'kniebuiging', 'back squat'],
  },
  {
    id: 'front-squat',
    name: 'Front squat',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.4 },
    aliases: ['front squat'],
  },
  {
    id: 'leg-press',
    name: 'Leg press (beenpers)',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.5 },
    aliases: ['leg press', 'beenpers'],
  },
  {
    id: 'lunges',
    name: 'Lunges (uitvalspas)',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.6 },
    aliases: ['lunges', 'uitvalspas', 'lunge'],
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian split squat',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.6 },
    aliases: ['bulgarian split squat', 'bulgaarse split squat', 'split squat'],
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian deadlift',
    category: 'legs',
    muscles: { hamstrings: 1, glutes: 0.6 },
    aliases: ['romanian deadlift', 'rdl', 'gestrekte deadlift', 'romeinse deadlift'],
  },
  {
    id: 'leg-curl',
    name: 'Leg curl (beencurl)',
    category: 'legs',
    muscles: { hamstrings: 1 },
    aliases: ['leg curl', 'beencurl', 'hamstring curl'],
  },
  {
    id: 'leg-extension',
    name: 'Leg extension (beenstrekker)',
    category: 'legs',
    muscles: { quads: 1 },
    aliases: ['leg extension', 'beenstrekker', 'beenstrekken'],
  },
  {
    id: 'hip-thrust',
    name: 'Hip thrust',
    category: 'legs',
    muscles: { glutes: 1, hamstrings: 0.4 },
    aliases: ['hip thrust', 'heup thrust', 'bilbrug', 'glute bridge'],
  },
  {
    id: 'calf-raise',
    name: 'Calf raise (kuitheffen)',
    category: 'legs',
    muscles: { calves: 1 },
    aliases: ['calf raise', 'kuitheffen', 'kuiten'],
  },
  {
    id: 'goblet-squat',
    name: 'Goblet squat',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.4 },
    aliases: ['goblet squat'],
  },

  // ---------- CORE ----------
  {
    id: 'plank',
    name: 'Plank (planken)',
    category: 'core',
    muscles: { core: 1 },
    aliases: ['plank', 'planken', 'planking'],
  },
  {
    id: 'crunches',
    name: 'Crunches',
    category: 'core',
    muscles: { core: 1 },
    aliases: ['crunches', 'buikspieroefening', 'crunch'],
  },
  {
    id: 'russian-twist',
    name: 'Russian twist',
    category: 'core',
    muscles: { core: 1 },
    aliases: ['russian twist', 'russische twist'],
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging leg raise',
    category: 'core',
    muscles: { core: 1 },
    aliases: ['hanging leg raise', 'hangende beenheffen', 'beenheffen'],
  },
  {
    id: 'cable-crunch',
    name: 'Cable crunch',
    category: 'core',
    muscles: { core: 1 },
    aliases: ['cable crunch', 'kabel crunch'],
  },
  {
    id: 'sit-up',
    name: 'Sit-ups',
    category: 'core',
    muscles: { core: 1 },
    aliases: ['sit-ups', 'sit ups', 'buikspitsen'],
  },
]

export function findExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id)
}

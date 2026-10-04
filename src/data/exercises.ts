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
    name: 'Bench Press',
    category: 'push',
    muscles: { chest: 1, triceps: 0.5, shoulders: 0.3 },
    aliases: ['bankdrukken', 'bench press', 'platte bankdrukken'],
  },
  {
    id: 'incline-bench-press',
    name: 'Incline Bench Press',
    category: 'push',
    muscles: { chest: 1, shoulders: 0.5, triceps: 0.3 },
    aliases: ['schuine bankdrukken', 'incline bench press', 'incline bankdrukken', 'schuine bank'],
  },
  {
    id: 'dumbbell-bench-press',
    name: 'Dumbbell Press',
    category: 'push',
    muscles: { chest: 1, triceps: 0.5, shoulders: 0.3 },
    aliases: ['dumbbell bankdrukken', 'halter bankdrukken', 'dumbbell press', 'dumbell squeeze press'],
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    category: 'push',
    muscles: { chest: 1, shoulders: 0.4, triceps: 0.3 },
    aliases: ['incline dumbbell press', 'schuine dumbbell bankdrukken'],
  },
  {
    id: 'machine-chest-press',
    name: 'Machine Press',
    category: 'push',
    muscles: { chest: 1, triceps: 0.4, shoulders: 0.3 },
    aliases: ['machine press', 'chest press machine'],
  },
  {
    id: 'diamond-pushup',
    name: 'Diamond Pushups',
    category: 'push',
    muscles: { triceps: 1, chest: 0.4 },
    aliases: ['diamond pushups', 'diamond push-ups', 'diamond push ups'],
  },
  {
    id: 'push-up',
    name: 'Push Ups',
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
    name: 'Military Press',
    category: 'push',
    muscles: { shoulders: 1, triceps: 0.5 },
    aliases: [
      'overhead press',
      'militaire pers',
      'schouderdrukken',
      'shoulder press staand',
      'military press',
      'kattlebeld shoulder press',
      'kettlebell shoulder press',
      'burpee to shoulder press',
      // Expliciete exacte alias: "shoulder press" is anders dubbelzinnig met de
      // langere, specifiekere aliassen van dumbbell-shoulder-press en
      // iso-lateral-shoulder-press die het woord ook bevatten.
      'shoulder press',
    ],
  },
  {
    id: 'dumbbell-shoulder-press',
    name: 'Shoulder Dumbbell Press',
    category: 'push',
    muscles: { shoulders: 1, triceps: 0.4 },
    aliases: [
      'dumbbell shoulder press',
      'halter schouderdrukken',
      'dumbbell press schouders',
      // Expliciet in deze woordvolgorde, zodat dit wint van de kortere
      // (en anders misleidende) substring-match "dumbbell press".
      'shoulder dumbbell press',
    ],
  },
  {
    id: 'iso-lateral-shoulder-press',
    name: 'Iso Lateral Machine Press',
    category: 'push',
    muscles: { shoulders: 1, triceps: 0.3 },
    aliases: ['iso lateral machine press', 'iso-lateral shoulder press'],
  },
  {
    id: 'shoulder-mobility',
    name: 'Schouder Mobiliteit Oefeningen',
    category: 'push',
    muscles: { shoulders: 0.4 },
    aliases: ['schouder mobiliteit oefeningen', 'shoulder mobility'],
  },
  {
    id: 'arnold-press',
    name: 'Arnold Press',
    category: 'push',
    muscles: { shoulders: 1, triceps: 0.3 },
    aliases: ['arnold press'],
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raises',
    category: 'push',
    muscles: { shoulders: 1 },
    aliases: [
      'lateral raise',
      'side lateral raise',
      'side lateral raises',
      'dumbbell lateral raise',
      'zijheffen',
      'zij heffen',
      'front rear raise',
    ],
  },
  {
    id: 'front-raise',
    name: 'Front Raises',
    category: 'push',
    muscles: { shoulders: 1 },
    aliases: ['front raise', 'voorheffen'],
  },
  {
    id: 'chest-fly',
    name: 'Peck Fly',
    category: 'push',
    muscles: { chest: 1 },
    aliases: ['chest fly', 'vliegende beweging', 'flyes', 'peck deck', 'peck fly', 'dumbbell flies', 'svend press'],
  },
  {
    id: 'cable-crossover',
    name: 'Cable Crossovers',
    category: 'push',
    muscles: { chest: 1 },
    aliases: ['cable crossover', 'kabel crossover', 'cable crossovers', 'low to high flys'],
  },
  {
    id: 'triceps-pushdown',
    name: 'Triceps Pushdown',
    category: 'push',
    muscles: { triceps: 1 },
    aliases: ['triceps pushdown', 'triceps kabel', 'pushdown', 'triceps extensie kabel', 'cable cross triceps', 'dumbell kickback'],
  },
  {
    id: 'home-cable-triceps-pushdown',
    name: 'Rope Pushdown (Home)',
    category: 'push',
    muscles: { triceps: 1 },
    aliases: ['rope push down home', 'extensions elastiek back', 'home pushdown'],
  },
  {
    id: 'skull-crusher',
    name: 'Skullcrushers',
    category: 'push',
    muscles: { triceps: 1 },
    aliases: [
      'skull crusher',
      'triceps extensie',
      'french press',
      'skullcrunchers',
      'dumbell skullcrunchers',
      'chest pullover skullcrunchers',
    ],
  },
  {
    id: 'close-grip-bench-press',
    name: 'Close Grip Bench Press',
    category: 'push',
    muscles: { triceps: 1, chest: 0.5 },
    aliases: ['close grip bankdrukken', 'smalle grip bankdrukken', 'close grip bench press'],
  },

  // ---------- PULL ----------
  {
    id: 'pull-up',
    name: 'Pull Up',
    category: 'pull',
    muscles: { back: 1, biceps: 0.5 },
    aliases: ['pull-ups', 'pull ups', 'optrekken', 'optrekoefening', 'dead hang', 'ring pull up', 'muscle up poging'],
  },
  {
    id: 'chin-up',
    name: 'Chin Up',
    category: 'pull',
    muscles: { back: 1, biceps: 0.6 },
    aliases: ['chin-ups', 'chin ups', 'optrekken onderhandse grip'],
  },
  {
    id: 'lat-pulldown',
    name: 'Pulldowns',
    category: 'pull',
    muscles: { back: 1, biceps: 0.4 },
    aliases: [
      'lat pulldown',
      'latissimus pulldown',
      'lattrekken',
      'pulldowns',
      'overhand pulldowns',
      'underhand pull down',
      'seated lat push down',
      'standing lat push down',
    ],
  },
  {
    id: 'home-lat-pulldown',
    name: 'Home Pull Down',
    category: 'pull',
    muscles: { back: 1, biceps: 0.4 },
    aliases: [
      'home overhand pulldown',
      'home pull down',
      'home standing lat pushdown',
      'home single cable pull down',
      'home single seated cable pull down',
    ],
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    category: 'pull',
    muscles: { back: 1, biceps: 0.4 },
    aliases: ['rij halterstang', 'bent over row', 'gebogen roeien', 'barbell row', 'chest supported row (traps)'],
  },
  {
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    category: 'pull',
    muscles: { back: 1, biceps: 0.4 },
    aliases: [
      'rij dumbbell',
      'dumbbell row',
      'halter roeien',
      'one arm row',
      'single dumbell row',
      'gorilla row',
      'incline dumbell row',
      'underhand incline db row',
    ],
  },
  {
    id: 'seated-cable-row',
    name: 'Cable Row',
    category: 'pull',
    muscles: { back: 1, biceps: 0.3 },
    aliases: ['seated cable row', 'roeien kabel', 'kabel roeien', 'zittend roeien', 'cable row', 'single cable row', 'iso lateral row'],
  },
  {
    id: 'home-cable-row',
    name: 'Home Cable Row',
    category: 'pull',
    muscles: { back: 1, biceps: 0.3 },
    aliases: ['home cable row', 'home single seated cable row', 'elastiek (home) row', '2x single cable'],
  },
  {
    id: 't-bar-row',
    name: 'T-Bar Row',
    category: 'pull',
    muscles: { back: 1, biceps: 0.3 },
    aliases: ['t-bar row', 't bar row'],
  },
  {
    id: 'pullover',
    name: 'Dumbbell Pullover',
    category: 'pull',
    muscles: { back: 0.7, chest: 0.5 },
    aliases: ['dumbell pullover', 'dumbbell pullover', 'pullover'],
  },
  {
    id: 'upright-row',
    name: 'Upright Rows',
    category: 'pull',
    muscles: { shoulders: 1, back: 0.3 },
    aliases: ['upright rows', 'upright row'],
  },
  {
    id: 'reverse-fly',
    name: 'Reverse Cable Fly',
    category: 'pull',
    muscles: { shoulders: 1, back: 0.3 },
    aliases: [
      'reverse cable flys',
      'reverse dumbell fly',
      'rear delta machine fly',
      'bent over rear delt fly',
      'body weight reverse cable flys',
    ],
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    category: 'pull',
    muscles: { shoulders: 0.5, back: 0.5 },
    aliases: ['face pull'],
  },
  {
    id: 'home-face-pull',
    name: 'Home Face Pull',
    category: 'pull',
    muscles: { shoulders: 0.5, back: 0.5 },
    aliases: ['home face pull'],
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
    name: 'Shrugs',
    category: 'pull',
    muscles: { back: 1 },
    aliases: ['shrugs', 'schouderophalen', 'trapezius oefening', 'traps smith machine'],
  },
  {
    id: 'biceps-curl',
    name: 'Barbell Bicep Curl',
    category: 'pull',
    muscles: { biceps: 1 },
    aliases: [
      'bicepscurl',
      'biceps curl',
      'halter curl',
      'barbell curl',
      'barbell bicep curl',
      'barbel straight curl',
      'dumbbell bicep curl',
      'concentration curl',
      'suspension trainer bicep curl',
      'incline dumbell curl',
    ],
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    category: 'pull',
    muscles: { biceps: 1 },
    aliases: ['hammer curl', 'hamercurl'],
  },
  {
    id: 'preacher-curl',
    name: 'Preacher Curl',
    category: 'pull',
    muscles: { biceps: 1 },
    aliases: ['preacher curl', 'scott curl'],
  },
  {
    id: 'cable-curl',
    name: 'Cable Curl',
    category: 'pull',
    muscles: { biceps: 1 },
    aliases: ['cable curl', 'kabel curl'],
  },
  {
    id: 'home-cable-curl',
    name: 'Home Rope Cable Curl',
    category: 'pull',
    muscles: { biceps: 1 },
    aliases: ['home rope cable curl', 'home straight cable curl'],
  },

  // ---------- LEGS ----------
  {
    id: 'squat',
    name: 'Squat',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.6 },
    aliases: ['squat', 'squats', 'kniebuiging', 'back squat', 'sissy squat'],
  },
  {
    id: 'front-squat',
    name: 'Front Squat',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.4 },
    aliases: ['front squat'],
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.5 },
    aliases: ['leg press', 'beenpers'],
  },
  {
    id: 'lunges',
    name: 'Lunges',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.6 },
    aliases: ['lunges', 'uitvalspas', 'lunge'],
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Lunges',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.6 },
    aliases: ['bulgarian split squat', 'bulgaarse split squat', 'split squat', 'bulgarian split lunges'],
  },
  {
    id: 'romanian-deadlift',
    name: 'RDL',
    category: 'legs',
    muscles: { hamstrings: 1, glutes: 0.6 },
    aliases: ['romanian deadlift', 'rdl', 'gestrekte deadlift', 'romeinse deadlift', 'straight leg deadlifts'],
  },
  {
    id: 'leg-curl',
    name: 'Leg Curls',
    category: 'legs',
    muscles: { hamstrings: 1 },
    aliases: [
      'leg curl',
      'beencurl',
      'hamstring curl',
      'hakken op bank (hams)',
      'single leg hamstring on bench curl',
    ],
  },
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell Swing',
    category: 'legs',
    muscles: { glutes: 1, hamstrings: 0.6, quads: 0.3 },
    aliases: ['kettle bell swing', 'kettlebell swing', 'reverse linge kettlebell swing', 'reverse lunge kettlebell swing'],
  },
  {
    id: 'box-jump',
    name: 'Box Jumping',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.5 },
    aliases: ['box jumping', 'box jump'],
  },
  {
    id: 'leg-extension',
    name: 'Leg Extensions',
    category: 'legs',
    muscles: { quads: 1 },
    aliases: ['leg extension', 'beenstrekker', 'beenstrekken'],
  },
  {
    id: 'hip-thrust',
    name: 'Hip Thrust',
    category: 'legs',
    muscles: { glutes: 1, hamstrings: 0.4 },
    aliases: ['hip thrust', 'heup thrust', 'bilbrug', 'glute bridge'],
  },
  {
    id: 'calf-raise',
    name: 'Calf Raise',
    category: 'legs',
    muscles: { calves: 1 },
    aliases: ['calf raise', 'kuitheffen', 'kuiten'],
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    category: 'legs',
    muscles: { quads: 1, glutes: 0.4 },
    aliases: ['goblet squat'],
  },

  // ---------- CORE ----------
  {
    id: 'plank',
    name: 'Plank',
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
    name: 'Russian Twist',
    category: 'core',
    muscles: { core: 1 },
    aliases: ['russian twist', 'russische twist', 'woodchopper', 'landmine rainbow'],
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raises',
    category: 'core',
    muscles: { core: 1 },
    aliases: ['hanging leg raise', 'hangende beenheffen', 'beenheffen', 'hanging leg raises'],
  },
  {
    id: 'leg-raise',
    name: 'Leg Raises',
    category: 'core',
    muscles: { core: 1 },
    aliases: ['leg raises', 'leg raise'],
  },
  {
    id: 'mountain-climber',
    name: 'Mountain Climbers',
    category: 'core',
    muscles: { core: 1 },
    aliases: ['mountain climbers', 'mountain climber'],
  },
  {
    id: 'core-other',
    name: 'Other Core Exercise',
    category: 'core',
    muscles: { core: 0.6 },
    aliases: [
      'ball overgooien, benen van de grond',
      'ball overgooien benen van de grond',
      'elastiek benen intrekken',
      'feet and arms up',
      'flutter kicks',
      'kettlebell windmill',
      'renegade rows',
      'crab walking',
      'farmers walk',
    ],
  },
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    category: 'core',
    muscles: { core: 1 },
    aliases: ['cable crunch', 'kabel crunch'],
  },
  {
    id: 'sit-up',
    name: 'Sit-Ups',
    category: 'core',
    muscles: { core: 1 },
    aliases: ['sit-ups', 'sit ups', 'buikspitsen'],
  },
]

export function findExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id)
}

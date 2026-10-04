const ONES = [
  'nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen',
  'tien', 'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien',
  'achttien', 'negentien',
]

const TENS: Record<number, string> = {
  20: 'twintig',
  30: 'dertig',
  40: 'veertig',
  50: 'vijftig',
  60: 'zestig',
  70: 'zeventig',
  80: 'tachtig',
  90: 'negentig',
}

function wordForNumber(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) {
    const tensValue = Math.floor(n / 10) * 10
    const rest = n % 10
    const tensWord = TENS[tensValue]
    if (rest === 0) return tensWord
    return `${ONES[rest]}en${tensWord}`
  }
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  const prefix = hundreds === 1 ? 'honderd' : `${ONES[hundreds]}honderd`
  return rest === 0 ? prefix : `${prefix}${wordForNumber(rest)}`
}

/** Bouwt een map van Nederlands telwoord -> getal, voor 0 t/m maxValue. */
function buildNumberWordMap(maxValue: number): Map<string, number> {
  const map = new Map<string, number>()
  for (let n = 0; n <= maxValue; n++) {
    map.set(wordForNumber(n), n)
  }
  return map
}

const NUMBER_WORD_MAP = buildNumberWordMap(300)
// Langste woorden eerst vervangen, zodat "honderdtien" niet per ongeluk
// eerst matcht op het losse woord "tien" binnenin.
const SORTED_WORDS = [...NUMBER_WORD_MAP.keys()].sort((a, b) => b.length - a.length)

// Samengestelde gym-termen die mensen soms los, soms aan elkaar schrijven
// ("push down" vs "pushdown"). Zonder deze normalisatie kan een alias met de
// ene spatiëring niet matchen op dezelfde term met de andere spatiëring.
const COMPOUND_WORD_FIXES: [RegExp, string][] = [
  [/\bpush\s*downs?\b/g, 'pushdown'],
  [/\bpull\s*downs?\b/g, 'pulldown'],
  [/\bpush\s*ups?\b/g, 'pushup'],
  [/\bpull\s*ups?\b/g, 'pullup'],
  [/\bchin\s*ups?\b/g, 'chinup'],
  [/\bsit\s*ups?\b/g, 'situp'],
]

export function normalizeDutchText(input: string): string {
  let text = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diakritische tekens weg (ë -> e)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  for (const [pattern, replacement] of COMPOUND_WORD_FIXES) {
    text = text.replace(pattern, replacement)
  }

  return text
}

/**
 * Vervangt Nederlandse telwoorden in een tekst door cijfers, zodat reguliere
 * expressies er daarna eenvoudig getallen uit kunnen halen.
 * Ondersteunt ook losstaande vormen zoals "een en twintig" -> "eenentwintig" -> 21.
 */
export function convertDutchNumberWordsToDigits(text: string): string {
  let normalized = normalizeDutchText(text)

  // "een en twintig" (los gesproken) samenvoegen tot "eenentwintig"
  normalized = normalized.replace(
    /\b(een|twee|drie|vier|vijf|zes|zeven|acht|negen)\s+en\s+(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)\b/g,
    '$1en$2',
  )

  for (const word of SORTED_WORDS) {
    if (word.length === 0) continue
    const value = NUMBER_WORD_MAP.get(word)!
    const re = new RegExp(`\\b${word}\\b`, 'g')
    normalized = normalized.replace(re, String(value))
  }

  return normalized
}

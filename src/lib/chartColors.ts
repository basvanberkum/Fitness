export interface ChartPalette {
  seriesPush: string
  seriesPull: string
  seriesLegs: string
  seriesCore: string
  statusGood: string
  statusWarning: string
  statusCritical: string
  statusSerious: string
  gridline: string
  baseline: string
  textMuted: string
  textSecondary: string
  surface1: string
}

const PALETTE: ChartPalette = {
  seriesPush: '#2f8fff',
  seriesPull: '#ff8a3d',
  seriesLegs: '#2bd97c',
  seriesCore: '#f5c518',
  statusGood: '#2bd97c',
  statusWarning: '#f5c518',
  statusCritical: '#f24b4b',
  statusSerious: '#ff8a3d',
  gridline: '#282828',
  baseline: '#404040',
  textMuted: '#727272',
  textSecondary: '#b3b3b3',
  surface1: '#121212',
}

/** De app heeft één vast donker thema (geen licht/donker-toggle meer). */
export function getChartPalette(): ChartPalette {
  return PALETTE
}

/**
 * Kleur op basis van de echte low/good/high-status (t.o.v. min/max-richtwaarde), niet op
 * basis van het numerieke scoregetal — dat loopt immers continu op tot 100 bij de max, dus
 * "binnen doel" (good) zit vaak onder 100 en zou anders ten onrechte als "warning" kleuren.
 */
export function statusColorForMuscleStatus(palette: ChartPalette, status: 'low' | 'good' | 'high'): string {
  if (status === 'good') return palette.statusGood
  if (status === 'high') return palette.statusSerious
  return palette.statusCritical
}

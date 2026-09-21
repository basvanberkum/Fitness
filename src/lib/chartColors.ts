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

const LIGHT: ChartPalette = {
  seriesPush: '#2a78d6',
  seriesPull: '#eb6834',
  seriesLegs: '#1baf7a',
  seriesCore: '#eda100',
  statusGood: '#0ca30c',
  statusWarning: '#fab219',
  statusCritical: '#d03b3b',
  statusSerious: '#ec835a',
  gridline: '#e1e0d9',
  baseline: '#c3c2b7',
  textMuted: '#898781',
  textSecondary: '#52514e',
  surface1: '#fcfcfb',
}

const DARK: ChartPalette = {
  seriesPush: '#3987e5',
  seriesPull: '#d95926',
  seriesLegs: '#199e70',
  seriesCore: '#c98500',
  statusGood: '#0ca30c',
  statusWarning: '#fab219',
  statusCritical: '#e66767',
  statusSerious: '#ec835a',
  gridline: '#2c2c2a',
  baseline: '#383835',
  textMuted: '#898781',
  textSecondary: '#c3c2b7',
  surface1: '#1a1a19',
}

export function getChartPalette(isDark: boolean): ChartPalette {
  return isDark ? DARK : LIGHT
}

export function statusColorFromPalette(palette: ChartPalette, score: number): string {
  if (score >= 100) return palette.statusGood
  if (score >= 50) return palette.statusWarning
  return palette.statusCritical
}

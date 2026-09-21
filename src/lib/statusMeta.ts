import type { MuscleStatus } from './scoring'

export const STATUS_META: Record<MuscleStatus, { label: string; color: string; description: string }> = {
  low: {
    label: 'Te weinig',
    color: 'var(--status-critical)',
    description: 'Onder de richtwaarde voor deze week',
  },
  good: {
    label: 'Goed',
    color: 'var(--status-good)',
    description: 'Binnen de richtwaarde voor deze week',
  },
  high: {
    label: 'Veel',
    color: 'var(--status-serious)',
    description: 'Boven de richtwaarde — let op herstel',
  },
}

export function statusColorForScore(score: number): string {
  if (score >= 100) return 'var(--status-good)'
  if (score >= 50) return 'var(--status-warning)'
  return 'var(--status-critical)'
}

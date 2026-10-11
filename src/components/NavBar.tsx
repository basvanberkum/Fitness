export type Tab = 'dashboard' | 'log' | 'history' | 'stats' | 'exercises' | 'data'

type IconProps = { active: boolean }

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function ScoreIcon({ active }: IconProps) {
  return (
    <svg {...ICON_PROPS} stroke="currentColor" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

function LogIcon({ active }: IconProps) {
  return (
    <svg {...ICON_PROPS} stroke="currentColor" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function HistoryIcon({ active }: IconProps) {
  return (
    <svg {...ICON_PROPS} stroke="currentColor" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </svg>
  )
}

function StatsIcon({ active }: IconProps) {
  return (
    <svg {...ICON_PROPS} stroke="currentColor" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}>
      <rect x="3" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="7" width="4" height="13" rx="1" />
      <rect x="17" y="3" width="4" height="17" rx="1" />
    </svg>
  )
}

function ExercisesIcon({ active }: IconProps) {
  return (
    <svg {...ICON_PROPS} stroke="currentColor" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}>
      <rect x="1.5" y="9" width="3" height="6" rx="1" />
      <rect x="19.5" y="9" width="3" height="6" rx="1" />
      <rect x="5.5" y="7" width="2.5" height="10" rx="1" />
      <rect x="16" y="7" width="2.5" height="10" rx="1" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function DataIcon({ active }: IconProps) {
  return (
    <svg {...ICON_PROPS} stroke="currentColor" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}>
      <ellipse cx="12" cy="5.5" rx="8" ry="2.8" />
      <path d="M4 5.5v13c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8v-13" />
      <path d="M4 12c0 1.5 3.6 2.8 8 2.8s8-1.3 8-2.8" />
    </svg>
  )
}

const TABS: { id: Tab; label: string; Icon: (props: IconProps) => React.ReactElement }[] = [
  { id: 'dashboard', label: 'Score', Icon: ScoreIcon },
  { id: 'log', label: 'Loggen', Icon: LogIcon },
  { id: 'history', label: 'Historie', Icon: HistoryIcon },
  { id: 'stats', label: 'Stats', Icon: StatsIcon },
  { id: 'exercises', label: 'Oefen.', Icon: ExercisesIcon },
  { id: 'data', label: 'Data', Icon: DataIcon },
]

export function NavBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav
      className="flex shrink-0 border-t"
      style={{
        background: 'var(--surface-1)',
        borderColor: 'var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
            style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Icon active={isActive} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

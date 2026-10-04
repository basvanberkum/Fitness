export type Tab = 'dashboard' | 'log' | 'history' | 'stats' | 'exercises' | 'data'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Score' },
  { id: 'log', label: 'Loggen' },
  { id: 'history', label: 'Historie' },
  { id: 'stats', label: 'Stats' },
  { id: 'exercises', label: 'Oefen.' },
  { id: 'data', label: 'Data' },
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
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className="flex-1 py-3 text-xs font-medium transition-colors"
          style={{
            color: active === tab.id ? 'var(--series-push)' : 'var(--text-muted)',
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

import { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { DataManagement } from './components/DataManagement'
import { ExerciseBrowser } from './components/ExerciseBrowser'
import { HistoryLog } from './components/HistoryLog'
import { LogWorkout } from './components/LogWorkout'
import { NavBar, type Tab } from './components/NavBar'
import { Stats } from './components/Stats'
import { useLogs } from './lib/useLogs'

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const logs = useLogs()

  return (
    <>
      <header
        className="shrink-0 px-4 py-3"
        style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Fitness Tracker
        </h1>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'dashboard' && <Dashboard logs={logs} />}
        {tab === 'log' && <LogWorkout logs={logs} />}
        {tab === 'history' && <HistoryLog logs={logs} />}
        {tab === 'stats' && <Stats logs={logs} />}
        {tab === 'exercises' && <ExerciseBrowser logs={logs} />}
        {tab === 'data' && <DataManagement />}
      </main>

      <NavBar active={tab} onChange={setTab} />
    </>
  )
}

import { useMemo } from 'react'
import { daysSinceLastBackup, type LogEntry } from '../lib/storage'
import { computeCardioScore } from '../lib/cardioScoring'
import { computeMuscleScores, computeTotalSets, generateTips } from '../lib/scoring'
import { CardioScoreCard } from './CardioScoreCard'
import { MuscleScoreCard } from './MuscleScoreCard'

export function Dashboard({ logs, onGoToData }: { logs: LogEntry[]; onGoToData: () => void }) {
  const now = useMemo(() => new Date(), [])
  const scores = useMemo(() => computeMuscleScores(logs, now), [logs, now])
  const cardioScore = useMemo(() => computeCardioScore(logs, now), [logs, now])
  const setsThisWeek = useMemo(() => computeTotalSets(logs, 7, now), [logs, now])
  const setsLast30dWeeklyAverage = useMemo(() => Math.round((computeTotalSets(logs, 30, now) / (30 / 7)) * 10) / 10, [logs, now])
  const tips = useMemo(() => generateTips(logs, now), [logs, now])
  const backupAge = useMemo(() => daysSinceLastBackup(now), [now])
  const showBackupReminder = logs.length > 0 && (backupAge === null || backupAge > 30)

  const sortedScores = useMemo(
    () => [...scores].sort((a, b) => b.weeklyScore - a.weeklyScore),
    [scores],
  )

  const daysSinceLastLog = useMemo(() => {
    if (logs.length === 0) return null
    const mostRecent = logs.reduce((max, l) => Math.max(max, new Date(l.date).getTime()), 0)
    return Math.floor((now.getTime() - mostRecent) / (24 * 60 * 60 * 1000))
  }, [logs, now])

  return (
    <div className="flex flex-col gap-6 px-4 py-5">
      {showBackupReminder && (
        <button
          type="button"
          onClick={onGoToData}
          className="rounded-xl p-3 text-left text-xs"
          style={{ background: 'var(--surface-1)', border: `1px solid var(--status-warning)` }}
        >
          <span style={{ color: 'var(--text-primary)' }}>
            {backupAge === null
              ? 'Je hebt nog nooit een back-up gemaakt.'
              : `Je laatste back-up is ${backupAge} dagen geleden.`}
          </span>{' '}
          <span style={{ color: 'var(--accent)' }}>Maak nu een back-up in "Data" →</span>
        </button>
      )}

      <section
        className="rounded-2xl p-6"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Sets deze week
            </p>
            <p className="mt-1 text-5xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {setsThisWeek}
            </p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Gem. sets/week (30d)
            </p>
            <p className="mt-1 text-5xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {setsLast30dWeeklyAverage}
            </p>
          </div>
        </div>
        <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Totaal aantal sets over alle krachtoefeningen (ongeacht spiergroep) — bekijk hieronder per spiergroep t.o.v.
          je eigen doel
        </p>
      </section>

      {daysSinceLastLog !== null && daysSinceLastLog > 7 && (
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Je laatste gelogde training was {daysSinceLastLog} dagen geleden. De cijfers hierboven gaan over recente
          training — bekijk "Statistieken" (met "Alles") voor je volledige geschiedenis.
        </p>
      )}

      {tips.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Tips voor je volgende training
          </h2>
          <div className="flex flex-col gap-3">
            {tips.map((tip) => (
              <div
                key={tip.muscle}
                className="rounded-xl p-4"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {tip.muscleLabel}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {tip.reason}
                </p>
                {tip.suggestions.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {tip.suggestions.map((ex) => (
                      <li
                        key={ex.id}
                        className="rounded-full px-2.5 py-1 text-xs"
                        style={{ background: 'var(--surface-page)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      >
                        {ex.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Per spiergroep
        </h2>
        <div className="flex flex-col gap-3">
          {sortedScores.map((score) => (
            <MuscleScoreCard key={score.muscle} score={score} logs={logs} now={now} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Cardio
        </h2>
        <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Telt niet mee in de sets hierboven — dat is losse voortgang t.o.v. je eigen wekelijkse cardio-doel.
          Wandelen/lichte cardio heeft bewust geen eigen doel.
        </p>
        <div className="flex flex-col gap-3">
          <CardioScoreCard score={cardioScore} />
        </div>
      </section>

      {logs.length === 0 && (
        <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Nog geen trainingen gelogd. Ga naar "Loggen" om je eerste oefening toe te voegen.
        </p>
      )}
    </div>
  )
}

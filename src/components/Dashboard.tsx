import { useMemo } from 'react'
import type { LogEntry } from '../lib/storage'
import { computeMuscleScores, computeOverallScore, generateTips } from '../lib/scoring'
import { statusColorForScore } from '../lib/statusMeta'
import { MuscleScoreCard } from './MuscleScoreCard'

export function Dashboard({ logs }: { logs: LogEntry[] }) {
  const now = useMemo(() => new Date(), [])
  const scores = useMemo(() => computeMuscleScores(logs, now), [logs, now])
  const overall = useMemo(() => computeOverallScore(scores), [scores])
  const tips = useMemo(() => generateTips(logs, now), [logs, now])

  const sortedScores = useMemo(
    () => [...scores].sort((a, b) => a.weeklyScore - b.weeklyScore),
    [scores],
  )

  const daysSinceLastLog = useMemo(() => {
    if (logs.length === 0) return null
    const mostRecent = logs.reduce((max, l) => Math.max(max, new Date(l.date).getTime()), 0)
    return Math.floor((now.getTime() - mostRecent) / (24 * 60 * 60 * 1000))
  }, [logs, now])

  return (
    <div className="flex flex-col gap-6 px-4 py-5">
      <section
        className="rounded-2xl p-6 text-center"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Weekscore (alle spiergroepen)
        </p>
        <p className="mt-1 text-5xl font-semibold" style={{ color: statusColorForScore(overall) }}>
          {overall}
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Gebaseerd op sets per spiergroep t.o.v. een algemene richtwaarde van 10-20 sets/week
          (bijstelbaar startpunt, geen medisch advies)
        </p>
      </section>

      {daysSinceLastLog !== null && daysSinceLastLog > 7 && (
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Je laatste gelogde training was {daysSinceLastLog} dagen geleden. De score hierboven gaat over recente
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
            <MuscleScoreCard key={score.muscle} score={score} />
          ))}
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

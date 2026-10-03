import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Sparkline } from '../charts'
import { getExercise } from '../../data/exercises'
import { exerciseProgression, seriesChange } from '../../lib/analytics'
import { suggestedWeight } from '../../lib/prs'
import { countingSets } from '../../lib/xp'
import { formatDate, relativeDay } from '../../lib/dates'
import { formatSet, formatWeight, pluralize } from '../../lib/format'
import type { SetUnit, WorkoutSession } from '../../types'

/**
 * "What did I do last time?"
 *
 * Shown above every exercise in the session runner. It is the single most useful
 * piece of context while training, so it is derived from the real log — the last
 * session that contains this exercise — and never from a guess.
 */

export function lastPerformance(
  sessions: readonly WorkoutSession[],
  exerciseId: string,
): { session: WorkoutSession; sets: ReturnType<typeof countingSets>; unit: SetUnit } | null {
  const ordered = [...sessions].sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.completedAt.localeCompare(b.completedAt))
  for (let i = ordered.length - 1; i >= 0; i--) {
    const session = ordered[i]
    const log = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!log) continue
    if (log.skipped) continue
    const sets = countingSets(log)
    if (sets.length === 0) continue
    return { session, sets, unit: log.unit }
  }
  return null
}

export function PreviousPerformance({
  sessions,
  exerciseId,
  units = 'kg',
  compact = false,
}: {
  sessions: readonly WorkoutSession[]
  exerciseId: string
  units?: 'kg' | 'lb'
  compact?: boolean
}) {
  const last = useMemo(() => lastPerformance(sessions, exerciseId), [sessions, exerciseId])
  const trend = useMemo(() => exerciseProgression(sessions, exerciseId, 'weight').slice(-12), [sessions, exerciseId])
  const change = useMemo(() => seriesChange(trend), [trend])
  const suggestion = useMemo(() => suggestedWeight(sessions, exerciseId), [sessions, exerciseId])
  const exercise = getExercise(exerciseId)

  if (!last) {
    return (
      <div className={`row-between ${compact ? 'tiny' : ''}`} style={{ gap: 'var(--sp-3)' }}>
        <span className="muted tiny row-tight">
          <Icon name="info" size={13} />
          First time logging {exercise?.name ?? 'this exercise'} — no previous performance yet
        </span>
        {suggestion ? null : <span className="chip tiny">Start light</span>}
      </div>
    )
  }

  const setList = last.sets
    .map((s) => (s.weight > 0 || last.unit === 'reps' ? formatSet(s.weight, s.reps, last.unit, units) : `${s.reps}`))
    .join('  ·  ')

  return (
    <div className="stack-2">
      <div className="row-between" style={{ gap: 'var(--sp-3)' }}>
        <span className="tiny muted row-tight" style={{ minWidth: 0 }}>
          <Icon name="history" size={13} style={{ flex: 'none' }} />
          <span className="truncate">
            <Link to={`/history/${last.session.id}`} className="muted">
              {relativeDay(last.session.date)}
            </Link>{' '}
            · <span className="num">{setList}</span>
            {last.sets[0]?.rpe ? <span className="faint"> @ RPE {last.sets[0].rpe}</span> : null}
          </span>
        </span>
        {change && Math.abs(change.delta) >= 0.1 ? (
          <span className={`chip ${change.delta > 0 ? 'chip--good' : 'chip--bad'}`} style={{ flex: 'none' }}>
            <Icon name={change.delta > 0 ? 'trending-up' : 'trending-down'} size={11} />
            {change.delta > 0 ? '+' : ''}
            {formatWeight(change.delta, units)}
          </span>
        ) : null}
      </div>

      {!compact && trend.length > 2 ? (
        <div className="row" style={{ gap: 'var(--sp-3)' }}>
          <div className="grow">
            <Sparkline
              values={trend.map((t) => t.value)}
              ariaLabel={`Top-set trend for ${exercise?.name ?? exerciseId} over the last ${trend.length} ${pluralize(trend.length, 'session')}`}
              height={30}
            />
          </div>
          <span className="tiny faint num" style={{ flex: 'none' }}>
            {formatDate(trend[0].date, 'short')} → {formatDate(trend[trend.length - 1].date, 'short')}
          </span>
        </div>
      ) : null}

      {suggestion && suggestion.basis !== 'none' ? (
        <p className="tiny faint">
          <Icon name="spark" size={11} style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 4 }} />
          Suggested: <strong className="num">{formatWeight(suggestion.weight, units)}</strong> × {suggestion.reps} — {suggestion.detail}
        </p>
      ) : null}
    </div>
  )
}

/** The same information as a one-line summary, for exercise pickers and lists. */
export function LastSetSummary({ sessions, exerciseId, units = 'kg' }: { sessions: readonly WorkoutSession[]; exerciseId: string; units?: 'kg' | 'lb' }) {
  const last = useMemo(() => lastPerformance(sessions, exerciseId), [sessions, exerciseId])
  if (!last) return <span className="tiny faint">Not logged yet</span>
  const top = last.sets.reduce((a, b) => (b.weight > a.weight ? b : a), last.sets[0])
  return (
    <span className="tiny muted num">
      {relativeDay(last.session.date)} · {formatSet(top.weight, top.reps, last.unit, units)}
    </span>
  )
}

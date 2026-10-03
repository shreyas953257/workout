import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../ui/Icon'
import { Card, Chip, Empty } from '../ui/primitives'
import { XP_KIND_LABEL } from '../../data/xp'
import { getProgram, getDay } from '../../data/programs'
import { formatDate, relativeDay } from '../../lib/dates'
import { formatDuration, formatSet } from '../../lib/format'
import type { PrSnapshot, WorkoutSession, XpAward } from '../../types'

/** Read-only views of a completed session — the history list and the detail page. */

export const PR_LABEL: Record<PrSnapshot['kind'], string> = {
  weight: 'Heaviest',
  reps: 'Most reps',
  e1rm: 'Best est. 1RM',
  volume: 'Most volume',
}

export const PR_ICON: Record<PrSnapshot['kind'], IconName> = {
  weight: 'zap',
  reps: 'repeat',
  e1rm: 'trending-up',
  volume: 'layers',
}

export function SessionCard({ session, index, units = 'kg' }: { session: WorkoutSession; index?: number; units?: 'kg' | 'lb' }) {
  const program = session.programId ? getProgram(session.programId) : undefined
  const day = program && session.dayId ? getDay(program.id, session.dayId) : undefined
  const exerciseCount = session.exercises.filter((e) => !e.skipped).length

  return (
    <Link
      to={`/history/${session.id}`}
      className="card card--pad card--interactive"
      style={{ display: 'block', color: 'inherit' }}
      aria-label={`Open the ${session.title} session from ${formatDate(session.date, 'medium')}`}
    >
      <div className="stack-3">
        <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
          <span
            className="empty__icon"
            style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--accent-soft)', color: 'var(--accent)', flex: 'none' }}
            aria-hidden
          >
            <strong className="num" style={{ fontSize: 'var(--fs-md)' }}>
              {session.date.slice(8, 10)}
            </strong>
          </span>
          <div className="stack-2 grow" style={{ minWidth: 0 }}>
            <h3 className="h5 truncate">{session.title}</h3>
            <p className="tiny faint truncate">
              {formatDate(session.date, 'medium')} · {relativeDay(session.date)}
              {day ? ` · ${day.name}` : program ? ` · ${program.name}` : ''}
              {session.deload ? ' · deload' : ''}
              {session.origin === 'import' ? ' · imported' : ''}
            </p>
          </div>
          {typeof index === 'number' ? (
            <span className="tiny faint num" style={{ flex: 'none' }}>
              #{index}
            </span>
          ) : null}
        </div>

        <div className="grid-4">
          <div className="stat">
            <span className="tiny faint">Sets</span>
            <span className="stat__value num small">{session.completedSets}</span>
          </div>
          <div className="stat">
            <span className="tiny faint">Exercises</span>
            <span className="stat__value num small">{exerciseCount}</span>
          </div>
          <div className="stat">
            <span className="tiny faint">Volume</span>
            <span className="stat__value num small">
              {Math.round(session.volumeKg).toLocaleString()} {units}
            </span>
          </div>
          <div className="stat">
            <span className="tiny faint">XP</span>
            <span className="stat__value num small" style={{ color: 'var(--accent)' }}>
              +{session.xp}
            </span>
          </div>
        </div>

        {session.prs.length > 0 || session.mood || session.energy ? (
          <div className="row-2">
            <Chip icon="clock">{formatDuration(session.durationMin)}</Chip>
            {session.prs.map((pr, i) => (
              <Chip key={`${pr.kind}-${i}`} tone="good" icon={PR_ICON[pr.kind]}>
                {PR_LABEL[pr.kind]} · {pr.exerciseName}
              </Chip>
            ))}
            {session.mood ? <Chip icon="smile">{`Mood ${session.mood}/5`}</Chip> : null}
            {session.energy ? <Chip icon="zap">{`Energy ${session.energy}/5`}</Chip> : null}
            {session.sleepHours ? <Chip icon="moon">{`${session.sleepHours} h sleep`}</Chip> : null}
          </div>
        ) : (
          <div className="row-2">
            <Chip icon="clock">{formatDuration(session.durationMin)}</Chip>
          </div>
        )}
      </div>
    </Link>
  )
}

/* -------------------------------------------------------------------------- */

export function XpBreakdownList({ breakdown, total }: { breakdown: readonly XpAward[]; total: number }) {
  if (breakdown.length === 0) {
    return (
      <p className="tiny muted">
        No XP was awarded — a session only earns XP when sets are actually completed. That is deliberate: it is what keeps the level
        number honest.
      </p>
    )
  }
  return (
    <div className="stack-2">
      {breakdown.map((line, i) => (
        <div key={`${line.kind}-${i}`} className="row-between" style={{ gap: 'var(--sp-3)' }}>
          <span className="small muted truncate">
            {XP_KIND_LABEL[line.kind] ?? line.kind}
            {line.label ? <span className="tiny faint"> · {line.label}</span> : null}
          </span>
          <span className="num small strong" style={{ color: 'var(--accent)', flex: 'none' }}>
            +{line.amount}
          </span>
        </div>
      ))}
      <div className="row-between" style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-3)', marginTop: 'var(--sp-1)' }}>
        <span className="strong">Total</span>
        <span className="h5 num" style={{ color: 'var(--accent)' }}>
          +{total} XP
        </span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function PrBadgeList({ prs }: { prs: readonly PrSnapshot[] }) {
  if (prs.length === 0) return <p className="tiny muted">No records were beaten in this session.</p>
  return (
    <div className="stack-2">
      {prs.map((pr, i) => (
        <div key={`${pr.exerciseId}-${pr.kind}-${i}`} className="row-between" style={{ gap: 'var(--sp-3)' }}>
          <span className="small truncate row-tight">
            <Icon name={PR_ICON[pr.kind]} size={14} className="warn" />
            <Link to={`/exercises/${pr.exerciseId}`} className="truncate">
              {pr.exerciseName}
            </Link>
          </span>
          <span className="num tiny faint" style={{ flex: 'none', textAlign: 'right' }}>
            {PR_LABEL[pr.kind]} · {pr.detail}
          </span>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function SessionExerciseTable({ session, units = 'kg' }: { session: WorkoutSession; units?: 'kg' | 'lb' }) {
  const [showSkipped, setShowSkipped] = useState(true)
  const logs = session.exercises.filter((log) => showSkipped || !log.skipped)

  if (session.exercises.length === 0) return <Empty icon="dumbbell" title="No exercises logged" />

  return (
    <div className="stack-3">
      {session.exercises.some((l) => l.skipped) ? (
        <button type="button" className="btn btn--sm btn--quiet" onClick={() => setShowSkipped((v) => !v)} aria-pressed={showSkipped}>
          <Icon name={showSkipped ? 'eye-off' : 'eye'} size={13} />
          {showSkipped ? 'Hide skipped' : 'Show skipped'}
        </button>
      ) : null}

      <div className="stack-3">
        {logs.map((log, i) => (
          <Card key={`${log.exerciseId}-${i}`} pad={false}>
            <div className="card__head" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
              <div className="row-tight" style={{ minWidth: 0 }}>
                <span className="badge badge--muted num" style={{ flex: 'none' }}>
                  {i + 1}
                </span>
                <div style={{ minWidth: 0 }}>
                  <Link to={`/exercises/${log.exerciseId}`} className="strong truncate" style={{ display: 'block', color: 'var(--text)' }}>
                    {log.name}
                  </Link>
                  <p className="tiny faint truncate">
                    {log.skipped
                      ? 'Skipped'
                      : `${log.sets.filter((s) => s.completed).length} of ${log.sets.length} sets${log.target ? ` · ${log.target}` : ''}${
                          log.rpeTarget ? ` @ RPE ${log.rpeTarget}` : ''
                        }`}
                    {log.substitutedFrom ? ` · substituted for ${log.substitutedFrom}` : ''}
                  </p>
                </div>
              </div>
              {log.skipped ? (
                <Chip tone="warn" icon="skip-forward">
                  Skipped
                </Chip>
              ) : null}
            </div>
            {!log.skipped && log.sets.length > 0 ? (
              <div className="card__body" style={{ padding: '0 var(--sp-4) var(--sp-3)' }}>
                <div className="row-2">
                  {log.sets.map((set, si) => (
                    <span
                      key={set.id ?? si}
                      className={`chip tiny num ${set.completed ? 'chip--good' : ''}`}
                      style={!set.completed ? { opacity: 0.55 } : undefined}
                      title={set.completed ? 'Completed' : 'Logged but not marked complete'}
                    >
                      {formatSet(set.weight, set.reps, log.unit, units)}
                      {set.rpe ? ` @${set.rpe}` : ''}
                      {set.warmup ? ' W' : ''}
                    </span>
                  ))}
                </div>
                {log.note ? (
                  <p className="tiny muted" style={{ marginTop: 'var(--sp-3)' }}>
                    “{log.note}”
                  </p>
                ) : null}
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function SessionEmpty({ onCreate }: { onCreate?: () => void }) {
  return (
    <Empty
      icon="clipboard"
      title="No sessions yet"
      text="Finish your first workout and it will appear here with its XP, volume and any records it broke."
      action={
        onCreate ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={onCreate}>
            <Icon name="play" size={14} />
            Start a session
          </button>
        ) : (
          <Link to="/workouts" className="btn btn--primary btn--sm">
            Go to today's workout
          </Link>
        )
      }
    />
  )
}

export function SessionActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="row-2">
      <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}>
        <Icon name="edit" size={14} />
        Edit
      </button>
      <button type="button" className="btn btn--danger btn--sm" onClick={onDelete}>
        <Icon name="trash" size={14} />
        Delete
      </button>
    </div>
  )
}

export function sessionSetCount(session: WorkoutSession): number {
  return session.exercises.reduce((n, log) => n + (log.skipped ? 0 : log.sets.filter((s) => s.completed).length), 0)
}

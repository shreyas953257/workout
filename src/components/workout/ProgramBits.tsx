import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../ui/Icon'
import { Card, Chip, Empty, Meter } from '../ui/primitives'
import { LEVEL_LABELS, PROGRESSION_MODEL_LABELS } from '../../data/programs'
import { exerciseName } from '../../data/exercises'
import { UNLOCK_MAP } from '../../data/unlocks'
import { unlockRequirementText } from '../../lib/unlocks'
import { dayForWeekday, programmeWeek, weekLabel } from '../../lib/program'
import { formatDate, todayKey, weekdayIndex } from '../../lib/dates'
import { formatDuration, pluralize } from '../../lib/format'
import type { Program, ProgramDay, WorkoutSession } from '../../types'

/**
 * Programme cards and day cards.
 *
 * A gated programme is visible but not startable, and says exactly what unlocks
 * it. Nothing essential is hidden behind a lock — the beginner and home
 * programmes are always available.
 */

const LEVEL_ICON: Record<Program['level'], IconName> = {
  beginner: 'sunrise',
  intermediate: 'mountain',
  home: 'home',
}

export interface ProgramUsage {
  sessions: number
  currentWeek: number
  totalWeeks: number
  lastDate?: string
  started: boolean
}

/** Derives how far the user has got through a programme from their real log. */
export function programUsage(program: Program, sessions: readonly WorkoutSession[], weekStartsOn: 0 | 1 = 1): ProgramUsage {
  const mine = sessions
    .filter((s) => s.programId === program.id)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  if (mine.length === 0) {
    return { sessions: 0, currentWeek: 1, totalWeeks: program.totalWeeks, started: false }
  }
  const week = programmeWeek(mine[0].date, todayKey(), weekStartsOn)
  return {
    sessions: mine.length,
    currentWeek: Math.max(1, Math.min(program.totalWeeks, week)),
    totalWeeks: program.totalWeeks,
    lastDate: mine[mine.length - 1].date,
    started: true,
  }
}

export function ProgramCard({
  program,
  usage,
  locked,
  requirement,
  onOpen,
}: {
  program: Program
  usage: ProgramUsage
  locked?: boolean
  requirement?: string
  onOpen?: () => void
}) {
  const pct = program.totalWeeks > 0 ? Math.min(100, ((usage.currentWeek - (usage.started ? 0 : 1)) / program.totalWeeks) * 100) : 0
  const today = dayForWeekday(program, weekdayIndex(todayKey()))

  const body = (
    <div className="stack-4">
      <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
        <span
          className="empty__icon"
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: locked ? 'var(--surface-2)' : 'var(--accent-soft)',
            color: locked ? 'var(--text-faint)' : 'var(--accent)',
          }}
          aria-hidden
        >
          <Icon name={locked ? 'lock' : LEVEL_ICON[program.level] ?? 'layers'} size={21} />
        </span>
        <div className="stack-2 grow" style={{ minWidth: 0 }}>
          <h3 className="h5 truncate">{program.name}</h3>
          <p className="tiny muted clamp-2">{program.tagline}</p>
        </div>
      </div>

      <div className="row-2">
        <Chip icon="layers">{LEVEL_LABELS[program.level] ?? program.level}</Chip>
        <Chip icon="calendar">{program.daysPerWeek} days / week</Chip>
        <Chip icon="clock">{program.totalWeeks} weeks</Chip>
        <Chip icon="trending-up">{PROGRESSION_MODEL_LABELS[program.progressionModel] ?? program.progressionModel}</Chip>
      </div>

      {locked && requirement ? (
        <div className="banner banner--warn">
          <Icon name="lock" size={15} />
          <span>
            <strong>Locked.</strong> {requirement}
          </span>
        </div>
      ) : usage.started ? (
        <div className="stack-2">
          <div className="row-between tiny">
            <span className="muted">
              Week {usage.currentWeek} of {usage.totalWeeks} · {usage.sessions} {pluralize(usage.sessions, 'session')} logged
            </span>
            <span className="num faint">{Math.round(pct)}%</span>
          </div>
          <Meter pct={pct} height="thin" label={`Progress through ${program.name}`} />
          {usage.lastDate ? <p className="tiny faint">Last trained {formatDate(usage.lastDate, 'medium')}</p> : null}
        </div>
      ) : (
        <p className="tiny faint">
          {today ? `Today would be ${today.name.split('—')[0].trim()}.` : 'Not started yet.'} {program.equipment.slice(0, 3).join(' · ')}
        </p>
      )}
    </div>
  )

  const className = `card card--pad ${locked ? '' : 'card--interactive'}`
  const style: React.CSSProperties = locked ? { opacity: 0.78 } : {}

  if (locked) {
    return (
      <div className={className} style={style} aria-disabled>
        {body}
      </div>
    )
  }

  return (
    <div className={className} style={style}>
      {body}
      <div className="row-2" style={{ marginTop: 'var(--sp-4)' }}>
        <Link to={`/programs/${program.id}`} className="btn btn--ghost btn--sm">
          Details
        </Link>
        <button type="button" className="btn btn--primary btn--sm" onClick={onOpen}>
          <Icon name="play" size={13} />
          {usage.started ? 'Continue' : 'Start'}
        </button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function ProgramDayCard({
  program,
  day,
  week,
  locked,
  isToday,
  onStart,
}: {
  program: Program
  day: ProgramDay
  week: number
  locked?: boolean
  isToday?: boolean
  onStart?: () => void
}) {
  const totalSets = day.exercises.reduce((n, e) => n + e.sets, 0)
  return (
    <Card className={isToday ? 'card--glow' : undefined} pad={false}>
      <div className="card__head">
        <div className="row-tight" style={{ minWidth: 0 }}>
          <span
            className="empty__icon"
            style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--accent-soft)', color: 'var(--accent)', flex: 'none' }}
            aria-hidden
          >
            <strong className="num">{day.badge || '•'}</strong>
          </span>
          <div style={{ minWidth: 0 }}>
            <h3 className="strong truncate">{day.name}</h3>
            <p className="tiny faint truncate">
              {day.exercises.length} exercises · {totalSets} sets · {formatDuration(day.estimatedMin)}
              {isToday ? ' · on the schedule today' : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--sm btn--primary"
          disabled={locked}
          onClick={onStart}
          title={locked ? 'This programme is still locked' : `Start ${day.name}`}
        >
          <Icon name="play" size={13} />
          Start
        </button>
      </div>
      <div className="card__body" style={{ paddingTop: 0 }}>
        <p className="tiny muted">{day.summary}</p>
        <ul className="stack-2" style={{ marginTop: 'var(--sp-3)' }}>
          {day.exercises.map((ex, i) => (
            <li key={`${ex.exerciseId}-${i}`} className="row-between tiny" style={{ gap: 'var(--sp-3)' }}>
              <Link to={`/exercises/${ex.exerciseId}`} className="truncate">
                {exerciseName(ex.exerciseId)}
              </Link>
              <span className="num faint" style={{ flex: 'none' }}>
                {ex.sets} × {ex.target}
              </span>
            </li>
          ))}
        </ul>
        <p className="tiny faint" style={{ marginTop: 'var(--sp-3)' }}>
          {weekLabel(program, week)}
        </p>
      </div>
    </Card>
  )
}

export function ProgramEmpty({ lockedOnly = false }: { lockedOnly?: boolean }) {
  return (
    <Empty
      icon="layers"
      title={lockedOnly ? 'Every programme here is still locked' : 'No programmes'}
      text={
        lockedOnly
          ? 'Keep training — the intermediate programme opens at level 4 or after 10 workouts, whichever comes first.'
          : 'Programmes are loaded from the reference material in this repository.'
      }
    />
  )
}

/** Requirement text for a locked programme, or undefined when it is free. */
export function programRequirement(program: Program, unlockedIds: readonly string[]): string | undefined {
  if (!program.unlockId) return undefined
  if (unlockedIds.includes(program.unlockId)) return undefined
  const unlock = UNLOCK_MAP[program.unlockId]
  return unlock ? unlockRequirementText(unlock) : 'Locked'
}

export function useProgramUsage(program: Program, sessions: readonly WorkoutSession[], weekStartsOn: 0 | 1 = 1): ProgramUsage {
  return useMemo(() => programUsage(program, sessions, weekStartsOn), [program, sessions, weekStartsOn])
}

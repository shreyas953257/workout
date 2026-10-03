import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, KeyValue, SectionHead, Stat } from '../ui/primitives'
import { ConfirmDialog } from '../ui/Modal'
import { PrBadgeList, SessionActions, SessionExerciseTable, XpBreakdownList, sessionSetCount } from '../workout/SessionBits'
import { LevelRing } from '../gamification'
import { useAppState, store } from '../../lib/store'
import { aggregateSession, compareSessions } from '../../lib/analytics'
import { formatClock, formatDate, relativeDay } from '../../lib/dates'
import { formatDuration, pluralize } from '../../lib/format'
import { toast } from '../ui/Toast'
import type { WorkoutSession } from '../../types'

/** One session, in full: every set, the XP it earned, and what it changed. */

function SessionNotFound({ error }: { error: string }) {
  return (
    <div className="page">
      <Empty
        icon="alert-circle"
        title="Session not found"
        text={error}
        action={
          <Link to="/history" className="btn btn--primary btn--sm">
            Back to history
          </Link>
        }
      />
    </div>
  )
}

export function SessionDetail() {
  const { id = '' } = useParams()
  const { data, progress } = useAppState()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const units = data.profile.units

  const session = useMemo(() => data.sessions.find((s) => s.id === id), [data.sessions, id])
  const previous = useMemo(() => {
    if (!session) return undefined
    return [...data.sessions]
      .filter((s) => s.id !== session.id && (s.date || '') <= (session.date || ''))
      .filter((s) => s.exercises.some((l) => session.exercises.some((x) => x.exerciseId === l.exerciseId && !x.skipped && !l.skipped)))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]
  }, [data.sessions, session])

  const next = useMemo(() => {
    if (!session) return undefined
    return [...data.sessions]
      .filter((s) => (s.date || '') > (session.date || '') || ((s.date || '') === (session.date || '') && (s.completedAt || '') > (session.completedAt || '')))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0]
  }, [data.sessions, session])

  if (!session) {
    return <SessionNotFound error={`No session in this browser's storage has the id “${id}”. It may have been deleted or removed by a reset.`} />
  }

  const aggregate = aggregateSession(session)
  const comparison = previous ? compareSessions(previous, session) : []
  const xp = session.xp || 0
  const setCount = sessionSetCount(session)

  return (
    <div className="page">
      <div className="row-between" style={{ alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
        <div className="stack-2" style={{ minWidth: 0 }}>
          <p className="eyebrow row-tight">
            <Icon name="calendar" size={12} />
            {formatDate(session.date, 'long')} · {relativeDay(session.date)} · logged {formatClock(session.completedAt)}
          </p>
          <h1 className="h2">{session.title}</h1>
          <div className="row-2">
            {session.programId ? <Chip icon="layers">{session.programId.replace(/-/g, ' ')}</Chip> : <Chip>free session</Chip>}
            {session.deload ? <Chip tone="warn" icon="moon">deload</Chip> : null}
            <Chip tone={session.origin === 'import' ? 'info' : 'neutral'} icon={session.origin === 'import' ? 'log-out' : 'check-circle'}>
              {session.origin}
            </Chip>
          </div>
        </div>
        <SessionActions
          onEdit={() => {
            store.updateDraft({
              id: session.id,
              title: session.title,
              programId: session.programId,
              dayId: session.dayId,
              startedAt: session.startedAt,
              notes: session.notes ?? '',
              mood: session.mood,
              energy: session.energy,
              sleepHours: session.sleepHours,
              deload: session.deload,
              rest: null,
              exercises: session.exercises.map((log) => ({
                exerciseId: log.exerciseId,
                name: log.name,
                unit: log.unit,
                target: log.target,
                rpeTarget: log.rpeTarget,
                restSec: data.preferences.defaultRestSec,
                sets: log.sets.map((s) => ({ ...s })),
                skipped: log.skipped || false,
                note: log.note ?? '',
              })),
            })
            toast.info('Session reopened as a draft', 'Finish it to overwrite this entry — nothing changes until you do.')
            navigate('/session')
          }}
          onDelete={() => setConfirmDelete(true)}
        />
      </div>

      <div className="grid-4">
        <Stat label="Sets completed" value={setCount} unit={`of ${session.exercises.reduce((n, l) => n + l.sets.length, 0)}`} icon="repeat" size="sm" />
        <Stat label="Volume" value={Math.round(session.volumeKg).toLocaleString()} unit={units} icon="layers" size="sm" />
        <Stat label="Duration" value={formatDuration(session.durationMin)} icon="clock" size="sm" hint={aggregate.averageRpe ? `Average RPE ${aggregate.averageRpe}` : undefined} />
        <Stat label="XP earned" value={xp.toLocaleString()} icon="spark" size="sm" />
      </div>

      <div className="grid-2">
        <Card title="Session notes" icon="note" sub={`${(session.notes ?? '').length} characters`}>
          {session.notes ? (
            <p className="small" style={{ whiteSpace: 'pre-wrap' }}>
              {session.notes}
            </p>
          ) : (
            <p className="small faint">No notes were written for this session.</p>
          )}
          <div className="row-2" style={{ marginTop: 'var(--sp-3)' }}>
            <Chip icon="clock">{formatClock(session.startedAt)} start</Chip>
            <Chip icon="check">{formatClock(session.completedAt)} finish</Chip>
            {session.mood ? <Chip icon="help-circle">mood {session.mood}/5</Chip> : null}
            {session.energy ? <Chip icon="zap">energy {session.energy}/5</Chip> : null}
            {session.sleepHours ? <Chip icon="moon">{session.sleepHours}h sleep</Chip> : null}
          </div>
        </Card>

        <Card title="What this session changed" icon="trending-up">
          {comparison.length === 0 ? (
            <Empty icon="trending-up" title="Nothing to compare" text="This is the first session containing these exercises, so there is no previous best to beat yet." />
          ) : (
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Exercise</th>
                    <th>Earlier</th>
                    <th>This session</th>
                    <th className="num">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.exerciseId}>
                      <td className="truncate">{row.name}</td>
                      <td className="num tiny">{row.a ? `${row.a.weight} × ${row.a.reps}` : '—'}</td>
                      <td className="num tiny">{row.b ? `${row.b.weight} × ${row.b.reps}` : '—'}</td>
                      <td className={`num ${row.delta && row.delta > 0 ? 'good' : row.delta && row.delta < 0 ? 'bad' : 'faint'}`}>
                        {row.delta === null ? '—' : `${row.delta > 0 ? '+' : ''}${row.delta}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {previous ? (
            <p className="tiny faint" style={{ marginTop: 'var(--sp-3)' }}>
              Compared against{' '}
              <Link to={`/history/${previous.id}`}>
                {previous.title} · {formatDate(previous.date, 'short')}
              </Link>
            </p>
          ) : null}
        </Card>
      </div>

      {session.prs.length > 0 ? <PrBadgeList prs={session.prs} /> : null}

      <section className="stack-3" aria-labelledby="sets">
        <SectionHead
          id="sets"
          icon="list-checks"
          title="Every set"
          sub={`${session.exercises.length} ${pluralize(session.exercises.length, 'exercise')} · ${setCount} completed sets · ${session.exercises.filter((l) => l.skipped).length} skipped`}
        />
        <SessionExerciseTable session={session} units={units} />
      </section>

      <div className="grid-2">
        <XpBreakdownList breakdown={session.xpBreakdown ?? []} total={xp} />
        <Card title="Session facts" icon="info">
          <KeyValue
            rows={[
              { k: 'Session id', v: session.id },
              { k: 'Programme', v: session.programId ?? 'none (free session)' },
              { k: 'Day', v: session.dayId ?? '—' },
              { k: 'Origin', v: session.origin },
              { k: 'Started', v: formatClock(session.startedAt) },
              { k: 'Finished', v: formatClock(session.completedAt) },
              { k: 'Exercises', v: `${aggregate.exercises} (${aggregate.skipped} skipped)` },
              { k: 'Average RPE', v: aggregate.averageRpe ? String(aggregate.averageRpe) : 'not logged' },
            ]}
          />
          <div className="row-2" style={{ marginTop: 'var(--sp-4)' }}>
            {next ? (
              <Link to={`/history/${next.id}`} className="btn btn--quiet btn--sm">
                Next session
                <Icon name="arrow-right" size={12} />
              </Link>
            ) : null}
            <Link to="/analytics" className="btn btn--quiet btn--sm">
              <Icon name="chart" size={12} />
              Charts
            </Link>
          </div>
        </Card>
      </div>

      <Card title="Where this session sits" icon="trophy">
        <div className="row" style={{ gap: 'var(--sp-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <LevelRing level={progress.level} size={96} />
          <div className="stack-2 grow" style={{ minWidth: 200 }}>
            <p className="small">
              This session added <strong>{xp.toLocaleString()} XP</strong>, which is{' '}
              {progress.xp > 0 ? `${Math.round((xp / progress.xp) * 100)}%` : '—'} of your {progress.xp.toLocaleString()} XP to date.
            </p>
            <p className="tiny faint">
              {progress.totals.workouts} sessions · streak {progress.streak.current} days · longest {progress.streak.longest} ·{' '}
              {progress.totals.distinctExercises} distinct exercises logged
            </p>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          const ok = store.deleteSession(session.id)
          setConfirmDelete(false)
          if (ok) {
            toast.success('Session deleted', 'Its XP, records, streak days, achievements and unlocks were recalculated from what is left.')
            navigate('/history')
          } else {
            toast.error('Could not delete that session')
          }
        }}
        title="Delete this session?"
        message="This removes the session from your log. XP, level, streak, personal records, achievements and unlocks are all recalculated from the remaining sessions — deletions are real, not cosmetic."
        confirmLabel="Delete session"
      />
    </div>
  )
}

export default SessionDetail
export type { WorkoutSession }

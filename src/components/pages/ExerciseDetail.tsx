import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, KeyValue, SectionHead, Stat } from '../ui/primitives'
import { ExerciseCoaching, ExerciseHeader, ExerciseHistory, ExerciseLockedNote, ExerciseSubstitutions, useExercise } from '../workout/ExerciseBits'
import { SessionCard } from '../workout/SessionBits'
import { UNLOCK_MAP } from '../../data/unlocks'
import { useAppState, store } from '../../lib/store'
import { startFreeSession, draftExerciseFor } from '../../lib/start'
import { exerciseProgression, sessionCountFor } from '../../lib/analytics'
import { suggestedWeight } from '../../lib/prs'
import { formatDate } from '../../lib/dates'
import { toast } from '../ui/Toast'

/** One exercise: how to do it, what you have lifted, and how to load it next time. */

export function ExerciseDetail() {
  const { id = '' } = useParams()
  const { data, progress } = useAppState()
  const navigate = useNavigate()
  const exercise = useExercise(id)
  const units = data.profile.units

  const sessions = useMemo(
    () => data.sessions.filter((s) => s.exercises.some((l) => l.exerciseId === id && !l.skipped)),
    [data.sessions, id],
  )
  const setCount = useMemo(
    () => data.sessions.reduce((n, s) => n + s.exercises.filter((l) => l.exerciseId === id).reduce((m, l) => m + l.sets.filter((x) => x.completed).length, 0), 0),
    [data.sessions, id],
  )
  const suggestion = useMemo(() => suggestedWeight(data.sessions, id), [data.sessions, id])
  const progression = useMemo(() => exerciseProgression(data.sessions, id, 'weight'), [data.sessions, id])

  if (!exercise) {
    return (
      <div className="page">
        <Empty
          icon="search"
          title="Exercise not found"
          text={`There is no exercise with the id “${id}” in the library.`}
          action={
            <Link to="/exercises" className="btn btn--primary btn--sm">
              Back to the library
            </Link>
          }
        />
      </div>
    )
  }

  const locked = Boolean(exercise.unlockId && !progress.unlockedIds.includes(exercise.unlockId))
  const unlock = exercise.unlockId ? UNLOCK_MAP[exercise.unlockId] : undefined
  const last = sessions.length > 0 ? [...sessions].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] : undefined
  const bestSet = useMemo(() => {
    let best: { weight: number; reps: number; date: string } | null = null
    for (const s of sessions) {
      for (const log of s.exercises.filter((l) => l.exerciseId === id)) {
        for (const set of log.sets.filter((x) => x.completed)) {
          if (!best || set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps)) {
            best = { weight: set.weight, reps: set.reps, date: s.date }
          }
        }
      }
    }
    return best
  }, [sessions, id])

  const startSession = () => {
    if (locked) {
      toast.warn('That variation is still locked', unlock ? unlock.name : undefined)
      navigate('/unlocks')
      return
    }
    startFreeSession(`Free session · ${exercise.name}`)
    store.updateDraft({ exercises: [draftExerciseFor(exercise.id, data.preferences.defaultRestSec)] })
    navigate('/session')
  }

  return (
    <div className="page">
      <ExerciseHeader
        exercise={exercise}
        locked={locked}
        requirement={unlock?.requirement}
        action={
          <div className="row-2">
            <button type="button" className="btn btn--primary btn--sm" disabled={locked} onClick={startSession}>
              <Icon name="play" size={13} />
              Log a session
            </button>
            <Link to="/exercises" className="btn btn--quiet btn--sm">
              <Icon name="arrow-left" size={13} />
              Library
            </Link>
          </div>
        }
      />

      {locked ? <ExerciseLockedNote exercise={exercise} unlockedIds={progress.unlockedIds} /> : null}

      <div className="grid-4">
        <Stat label="Sets logged" value={setCount} icon="repeat" size="sm" />
        <Stat label="Sessions" value={sessionCountFor(data.sessions, id)} icon="calendar" size="sm" />
        <Stat label="XP per set" value={exercise.xpPerSet} unit="XP" icon="spark" size="sm" />
        <Stat
          label="Best set"
          value={bestSet ? `${bestSet.weight || '—'}×${bestSet.reps}` : '—'}
          unit={bestSet && bestSet.weight > 0 ? units : undefined}
          icon="personal-best"
          size="sm"
          hint={bestSet ? `Logged ${formatDate(bestSet.date, 'medium')}` : 'No completed sets yet'}
        />
      </div>

      {suggestion ? (
        <Card title="Next time" icon="trending-up" sub={suggestion.detail}>
          <div className="row-between panel" style={{ padding: 'var(--sp-3)' }}>
            <div className="stack-2">
              <span className="h3 num">
                {suggestion.weight} {units} × {suggestion.reps}
              </span>
              <span className="tiny faint">
                Based on your {suggestion.basis === 'last' ? 'most recent session' : 'best session'} — the app never guesses load, it reads your log.
              </span>
            </div>
            <Chip tone="accent">suggested</Chip>
          </div>
        </Card>
      ) : null}

      <ExerciseCoaching exercise={exercise} />

      <div className="grid-2">
        <Card title="Details" icon="info">
          <KeyValue
            rows={[
              { k: 'Movement pattern', v: exercise.pattern.replace(/-/g, ' ') },
              { k: 'Primary muscles', v: exercise.muscles.join(', ') },
              { k: 'Secondary', v: exercise.secondary.length > 0 ? exercise.secondary.join(', ') : '—' },
              { k: 'Equipment', v: exercise.equipment.join(', ') },
              { k: 'Tier', v: exercise.tier },
              { k: 'Measured in', v: exercise.unit },
              { k: 'Per side', v: exercise.perSide ? 'yes' : 'no' },
              { k: 'Source', v: exercise.source === 'added' ? 'added for the home programme' : exercise.source },
            ]}
          />
          {exercise.notes ? <p className="tiny muted" style={{ marginTop: 'var(--sp-3)' }}>{exercise.notes}</p> : null}
        </Card>

        <ExerciseSubstitutions exercise={exercise} unlockedIds={progress.unlockedIds} />
      </div>

      <ExerciseHistory exercise={exercise} sessions={data.sessions} units={units} showE1rm={progress.unlockedIds.includes('feature:e1rm')} />

      <section className="stack-3" aria-labelledby="logged">
        <SectionHead
          id="logged"
          icon="history"
          title="Sessions that included this"
          sub={last ? `Last trained ${formatDate(last.date, 'medium')}` : 'Not logged yet'}
        />
        {sessions.length === 0 ? (
          <Card>
            <Empty
              icon="clipboard"
              title="Nothing logged yet"
              text="Complete a set of this exercise and the records, charts and next-time suggestion all start working."
              action={
                <button type="button" className="btn btn--ghost btn--sm" disabled={locked} onClick={startSession}>
                  Start a session with it
                </button>
              }
            />
          </Card>
        ) : (
          <div className="stack-3">
            {[...sessions]
              .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
              .slice(0, 5)
              .map((s) => (
                <SessionCard key={s.id} session={s} units={units} />
              ))}
          </div>
        )}
      </section>

      {progression.length > 1 ? (
        <p className="tiny faint center">
          {progression.length} sessions with usable data · charts use top-set weight, estimated 1RM, reps and volume separately
        </p>
      ) : null}
    </div>
  )
}

export default ExerciseDetail

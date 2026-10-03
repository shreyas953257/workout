import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, SectionHead, Stat } from '../ui/primitives'
import { ExerciseFilterBar, ExerciseRow, useExerciseFilters } from '../workout/ExerciseList'
import { filterExercises } from '../workout/ExerciseList'
import { EXERCISES, WARMUP_MENUS, COOLDOWN, PAIN_TRIAGE } from '../../data/exercises'
import { useAppState } from '../../lib/store'
import { UNLOCK_MAP } from '../../data/unlocks'
import { unlockRequirementText } from '../../lib/unlocks'
import { exerciseProgression } from '../../lib/analytics'

/** The exercise library: search, filter, and jump into a full reference page. */

export function Exercises() {
  const { data, progress } = useAppState()
  const { filter, setFilter, effective, toggle, reset, activeCount } = useExerciseFilters()
  const [view, setView] = useState<'grid' | 'table'>('grid')

  const results = useMemo(() => filterExercises(EXERCISES, effective, progress.unlockedIds), [effective, progress.unlockedIds])

  const trained = useMemo(() => {
    const ids = new Set<string>()
    for (const s of data.sessions) for (const log of s.exercises) if (!log.skipped) ids.add(log.exerciseId)
    return ids
  }, [data.sessions])

  return (
    <div className="page">
      <SectionHead
        icon="book"
        title="Exercise library"
        sub="Every movement transcribed from reference/exercise-library.md — setup, cues, common mistakes and substitutions."
        actions={
          <Link to="/docs/exercise-library" className="btn btn--quiet btn--sm">
            <Icon name="note" size={13} />
            Source doc
          </Link>
        }
      />

      <div className="grid-4">
        <Stat label="Exercises" value={EXERCISES.length} icon="book" size="sm" />
        <Stat label="You have trained" value={trained.size} icon="check-circle" size="sm" />
        <Stat label="Substitution pairs" value={EXERCISES.reduce((n, e) => n + e.substitutions.length, 0)} icon="repeat" size="sm" />
        <Stat label="Locked variations" value={EXERCISES.filter((e) => e.unlockId && !progress.unlockedIds.includes(e.unlockId)).length} icon="lock" size="sm" />
      </div>

      <Card>
        <div className="stack-3">
          <ExerciseFilterBar
            filter={filter}
            setFilter={(patch) => setFilter((prev) => ({ ...prev, ...patch }))}
            toggle={toggle}
            reset={reset}
            activeCount={activeCount}
            resultCount={results.length}
          />
          <div className="row-between">
            <p className="tiny faint">
              {results.length} of {EXERCISES.length} exercises
              {activeCount > 0 ? ` · ${activeCount} filters on` : ''}
            </p>
            <div className="segmented" role="group" aria-label="Result layout">
              {(['grid', 'table'] as const).map((v) => (
                <button key={v} type="button" className={`segmented__item ${view === v ? 'is-on' : ''}`} aria-pressed={view === v} onClick={() => setView(v)}>
                  <Icon name={v === 'grid' ? 'layers' : 'list-checks'} size={13} />
                  {v === 'grid' ? 'Cards' : 'List'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {results.length === 0 ? (
        <Card>
          <Empty
            icon="search"
            title="Nothing matched"
            text="Try a shorter search, or clear the filters. Searching matches names, muscles, equipment and cues."
            action={
              <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
                Clear filters
              </button>
            }
          />
        </Card>
      ) : view === 'grid' ? (
        <div className="auto-grid" style={{ '--min': '260px' } as React.CSSProperties}>
          {results.map((exercise) => {
            const locked = Boolean(exercise.unlockId && !progress.unlockedIds.includes(exercise.unlockId))
            const unlock = exercise.unlockId ? UNLOCK_MAP[exercise.unlockId] : undefined
            const done = trained.has(exercise.id)
            const sets = data.sessions.reduce(
              (n, s) => n + s.exercises.filter((l) => l.exerciseId === exercise.id).reduce((m, l) => m + l.sets.filter((x) => x.completed).length, 0),
              0,
            )
            return (
              <Card key={exercise.id} className={locked ? undefined : 'card--interactive'} pad={false}>
                <Link to={`/exercises/${exercise.id}`} className="card__body stack-3" style={{ padding: 'var(--sp-4)', display: 'block', color: 'inherit', textDecoration: 'none' }}>
                  <div className="row-tight" style={{ minWidth: 0 }}>
                    <Icon name={locked ? 'lock' : done ? 'check-circle' : 'dumbbell'} size={15} className={locked ? 'faint' : done ? 'good' : 'accent'} />
                    <h3 className="strong truncate">{exercise.name}</h3>
                  </div>
                  <p className="tiny muted clamp-2">{exercise.cues[0]}</p>
                  <div className="row-2">
                    <Chip>{exercise.pattern.replace(/-/g, ' ')}</Chip>
                    <Chip>{exercise.tier}</Chip>
                    {exercise.perSide ? <Chip tone="info">per side</Chip> : null}
                  </div>
                  <p className="tiny faint">
                    {exercise.equipment.join(' · ')} · {exercise.xpPerSet} XP/set{exercise.source === 'added' ? ' · added for the home programme' : ''}
                  </p>
                  {sets > 0 ? (
                    <p className="tiny faint">
                      <Icon name="repeat" size={11} /> {sets} sets logged
                    </p>
                  ) : null}
                  {locked && unlock ? <p className="tiny warn">{unlockRequirementText(unlock)}</p> : null}
                </Link>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="stack-2">
          {results.map((exercise) => {
            const locked = Boolean(exercise.unlockId && !progress.unlockedIds.includes(exercise.unlockId))
            const unlock = exercise.unlockId ? UNLOCK_MAP[exercise.unlockId] : undefined
            const series = exerciseProgression(data.sessions, exercise.id, exercise.unit === 'reps' ? 'weight' : 'reps')
            return (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                locked={locked}
                requirement={unlock ? unlockRequirementText(unlock) : undefined}
                to={`/exercises/${exercise.id}`}
                action={
                  series.length > 1 ? (
                    <span className="chip chip--quiet">
                      {series.length} data points
                    </span>
                  ) : trained.has(exercise.id) ? (
                    <Chip tone="good">Trained</Chip>
                  ) : null
                }
              />
            )
          })}
        </div>
      )}

      <div className="grid-2">
        <Card title="Warm-up menus" icon="sunrise" sub="From reference/warmup-and-cooldown.md — use the one matching the day">
          <div className="stack-4">
            {Object.entries(WARMUP_MENUS).map(([key, stages]) => (
              <div key={key} className="stack-2">
                <p className="eyebrow">{key} day</p>
                <ul className="stack-2">
                  {stages.flatMap((stage) => stage.drills).slice(0, 5).map((d) => (
                    <li key={`${key}-${d.name}`} className="tiny row-between" style={{ gap: 'var(--sp-3)' }}>
                      <span className="truncate">{d.name}</span>
                      <span className="num faint" style={{ flex: 'none' }}>
                        {d.dose}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
        <div className="stack-3">
          <Card title="Cool-down" icon="wind" sub="Five minutes, after the last set">
            <ul className="stack-2">
              {(COOLDOWN.general ?? []).map((c) => (
                <li key={c} className="tiny row-tight">
                  <Icon name="check" size={11} className="good" />
                  {c}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Session length" icon="clock" sub="How long each set is expected to take, used for progress estimates while you train">
            <ul className="stack-2">
              {EXERCISES.slice(0, 1).length === 0 ? null : null}
              {Object.entries(
                EXERCISES.reduce<Record<string, { total: number; count: number }>>((acc, e) => {
                  const tier = String(e.tier)
                  const entry = acc[tier] ?? { total: 0, count: 0 }
                  entry.total += e.estSetSeconds ?? 0
                  entry.count += 1
                  acc[tier] = entry
                  return acc
                }, {}),
              ).map(([tier, { total, count }]) => (
                <li key={tier} className="tiny row-between">
                  <span className="capitalize">{tier}</span>
                  <span className="num faint">{count > 0 ? Math.round(total / count) : 0}s per set</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card title="When something hurts" icon="alert-triangle" sub="Straight from the pain triage table — read this before pushing through">
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Sensation</th>
                <th>Verdict</th>
                <th>What to do</th>
              </tr>
            </thead>
            <tbody>
              {PAIN_TRIAGE.map((row) => (
                <tr key={row.sensation}>
                  <td>{row.sensation}</td>
                  <td>
                    <Chip tone={row.verdict === 'ok' ? 'good' : row.verdict === 'caution' ? 'warn' : 'bad'}>{String(row.verdict)}</Chip>
                  </td>
                  <td className="tiny">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default Exercises

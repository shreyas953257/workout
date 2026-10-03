import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, SectionHead } from '../ui/primitives'
import { ProgramCard, programRequirement, programUsage } from '../workout/ProgramBits'
import { LEVEL_LABELS, PROGRESSION_MODEL_LABELS, PROGRAMS } from '../../data/programs'
import { UNLOCK_MAP } from '../../data/unlocks'
import { unlockRequirementText } from '../../lib/unlocks'
import { useAppState, store } from '../../lib/store'
import { isProgramUnlocked, startProgramDay } from '../../lib/start'
import { dayForWeekday } from '../../lib/program'
import { weekForProgram } from '../../lib/start'
import { todayKey, weekdayIndex } from '../../lib/dates'
import { toast } from '../ui/Toast'

/** All three programmes, transcribed from `programs/`, with real usage numbers. */

export function Programs() {
  const { data, progress } = useAppState()
  const navigate = useNavigate()

  const rows = useMemo(
    () =>
      PROGRAMS.map((program) => ({
        program,
        usage: programUsage(program, data.sessions, data.preferences.weekStartsOn),
        locked: !isProgramUnlocked(program, progress.unlockedIds),
        requirement: programRequirement(program, progress.unlockedIds),
      })),
    [data.sessions, data.preferences.weekStartsOn, progress.unlockedIds],
  )

  const start = (programId: string) => {
    const program = PROGRAMS.find((p) => p.id === programId)
    if (!program) return
    if (!isProgramUnlocked(program, progress.unlockedIds)) {
      const unlock = program.unlockId ? UNLOCK_MAP[program.unlockId] : undefined
      toast.warn('That programme is still locked', unlock ? unlockRequirementText(unlock) : undefined)
      navigate('/unlocks')
      return
    }
    const week = weekForProgram(program, data.sessions, data.preferences.weekStartsOn)
    const day = dayForWeekday(program, weekdayIndex(todayKey())) ?? program.days[0]
    if (startProgramDay(program.id, day.id, week, data.preferences.defaultRestSec)) {
      navigate('/session')
    }
  }

  return (
    <div className="page">
      <SectionHead
        icon="layers"
        title="Workout programmes"
        sub="Three complete programmes, transcribed from the Markdown files in this repository. Nothing is generated — the set, rep and deload schemes are the ones written in programs/."
        actions={
          <Link to="/docs" className="btn btn--quiet btn--sm">
            <Icon name="note" size={13} />
            Read the source docs
          </Link>
        }
      />

      <div className="auto-grid" style={{ '--min': '300px' } as React.CSSProperties}>
        {rows.map(({ program, usage, locked, requirement }) => (
          <ProgramCard key={program.id} program={program} usage={usage} locked={locked} requirement={requirement} onOpen={() => start(program.id)} />
        ))}
      </div>

      <Card title="Which one should I pick?" icon="help" sub="From getting-started.md — the honest answer is the one you will actually do">
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Programme</th>
                <th>Level</th>
                <th className="num">Days</th>
                <th className="num">Weeks</th>
                <th>Progression</th>
                <th>Equipment</th>
              </tr>
            </thead>
            <tbody>
              {PROGRAMS.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/programs/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{LEVEL_LABELS[p.level]}</td>
                  <td className="num">{p.daysPerWeek}</td>
                  <td className="num">{p.totalWeeks}</td>
                  <td>{PROGRESSION_MODEL_LABELS[p.progressionModel]}</td>
                  <td className="tiny">{p.equipment.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny muted" style={{ marginTop: 'var(--sp-3)' }}>
          New to lifting, or coming back after more than a few weeks off? Start with the beginner full-body programme. It is never locked and
          it is the one the rest of the handbook assumes.
        </p>
      </Card>

      <Card title="Active programme" icon="pin" sub="Setting one makes the dashboard and the workouts page show its next day">
        {rows.filter((r) => !r.locked).length === 0 ? (
          <Empty icon="lock" title="No unlocked programmes" text="Complete a few sessions to open the beginner programme." />
        ) : (
          <div className="row-2">
            {rows
              .filter((r) => !r.locked)
              .map(({ program }) => (
                <button
                  key={program.id}
                  type="button"
                  className={`chip ${data.preferences.activeProgramId === program.id ? 'is-on' : ''}`}
                  aria-pressed={data.preferences.activeProgramId === program.id}
                  onClick={() => {
                    store.updatePreferences({ activeProgramId: program.id })
                    toast.success(`${program.name} is now active`, 'Today’s day will show on your dashboard.')
                  }}
                >
                  {program.name}
                </button>
              ))}
            {data.preferences.activeProgramId ? (
              <button type="button" className="chip" onClick={() => store.updatePreferences({ activeProgramId: undefined })}>
                <Icon name="x" size={11} />
                Clear
              </button>
            ) : null}
          </div>
        )}
      </Card>

      <Card title="Locked content" icon="lock" sub="Nothing essential is behind a lock — only the intermediate programme and five advanced variations">
        <div className="stack-3">
          {PROGRAMS.filter((p) => p.unlockId).map((p) => {
            const unlock = UNLOCK_MAP[p.unlockId!]
            const unlocked = progress.unlockedIds.includes(p.unlockId!)
            return (
              <div key={p.id} className="row-between panel" style={{ padding: 'var(--sp-3)', gap: 'var(--sp-3)' }}>
                <div className="stack-2" style={{ minWidth: 0 }}>
                  <span className="strong truncate row-tight">
                    <Icon name={unlocked ? 'unlock' : 'lock'} size={13} className={unlocked ? 'good' : 'faint'} />
                    {p.name}
                  </span>
                  <span className="tiny faint">{unlock ? unlockRequirementText(unlock) : 'Locked'}</span>
                </div>
                <Chip tone={unlocked ? 'good' : 'warn'}>{unlocked ? 'Unlocked' : 'Locked'}</Chip>
              </div>
            )
          })}
          <Link to="/unlocks" className="btn btn--quiet btn--sm">
            <Icon name="unlock" size={13} />
            See all unlocks
          </Link>
        </div>
      </Card>

      <p className="tiny faint center">
        Deload weeks are built into every programme — they are part of the plan, not a break from it.
      </p>
    </div>
  )
}

export default Programs

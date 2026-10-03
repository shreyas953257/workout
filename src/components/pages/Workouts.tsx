import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, SectionHead } from '../ui/primitives'
import { ProgramDayCard } from '../workout/ProgramBits'
import { warmupMenuFor, PainTriageCard } from '../workout/ExerciseBits'
import { COOLDOWN } from '../../data/exercises'
import { PROGRAMS, getProgram } from '../../data/programs'
import { useAppState } from '../../lib/store'
import { isProgramUnlocked, startFreeSession, startProgramDay, todayPlan, weekForProgram } from '../../lib/start'
import { dayForWeekday, weekLabel } from '../../lib/program'
import { formatDate, todayKey, weekdayIndex } from '../../lib/dates'
import { formatDuration, pluralize } from '../../lib/format'

/**
 * "What do I train today?"
 *
 * Shows the whole week for the active programme, marks today, and lets you start
 * any day directly. Gated programmes are listed but explain what unlocks them.
 */

export function Workouts() {
  const { data, progress, draft } = useAppState()
  const navigate = useNavigate()
  const today = todayKey()
  const weekday = weekdayIndex(today)
  const plan = useMemo(() => todayPlan(data, progress.unlockedIds), [data, progress.unlockedIds])

  const active = data.preferences.activeProgramId ? getProgram(data.preferences.activeProgramId) : undefined
  const shown = active && isProgramUnlocked(active, progress.unlockedIds) ? active : plan.kind === 'scheduled' ? plan.program : PROGRAMS.find((p) => isProgramUnlocked(p, progress.unlockedIds))

  const week = shown ? weekForProgram(shown, data.sessions, data.preferences.weekStartsOn) : 1
  const scheduledToday = shown ? dayForWeekday(shown, weekday) : undefined
  const emphasis = scheduledToday?.emphasis ?? (plan.kind === 'scheduled' ? plan.day.emphasis : 'lower')
  const warmup = warmupMenuFor(emphasis)
  const cooldown = COOLDOWN[warmup.key] ?? COOLDOWN.general ?? []

  const start = (programId: string, dayId: string) => {
    const w = weekForProgram(getProgram(programId)!, data.sessions, data.preferences.weekStartsOn)
    if (startProgramDay(programId, dayId, w, data.preferences.defaultRestSec)) navigate('/session')
  }

  return (
    <div className="page">
      {draft ? (
        <div className="banner banner--accent">
          <Icon name="play" size={16} />
          <span>
            <strong>{draft.title}</strong> is still open — {draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0)}{' '}
            sets logged.
          </span>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/session')}>
            Resume
          </button>
        </div>
      ) : null}

      <section className="stack-3" aria-labelledby="today">
        <SectionHead
          id="today"
          icon="calendar-check"
          title={formatDate(today, 'long')}
          sub={
            plan.kind === 'scheduled'
              ? `${plan.program.name} · ${weekLabel(plan.program, plan.week)}${plan.resolved.deload ? ' · deload' : ''}`
              : plan.reason
          }
          actions={
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                startFreeSession()
                navigate('/session')
              }}
            >
              <Icon name="plus" size={13} />
              Free session
            </button>
          }
        />

        {plan.kind === 'scheduled' ? (
          <ProgramDayCard program={plan.program} day={plan.day} week={plan.week} isToday={plan.onSchedule} onStart={() => start(plan.program.id, plan.day.id)} />
        ) : (
          <Card>
            <Empty
              icon="moon"
              title={plan.kind === 'rest' ? 'Rest day' : 'No plan set'}
              text={
                plan.kind === 'rest'
                  ? `${plan.reason} A rest day is part of the programme, not a failure of it.`
                  : 'Pick a programme below and set it active, or log a free session and choose the exercises yourself.'
              }
            />
          </Card>
        )}
      </section>

      {shown ? (
        <section className="stack-3" aria-labelledby="week-plan">
          <SectionHead
            id="week-plan"
            icon="layers"
            title={`This week in ${shown.name}`}
            sub={`${shown.daysPerWeek} training days · ${weekLabel(shown, week)} · ${shown.equipment.slice(0, 4).join(' · ')}`}
            actions={<Link to={`/programs/${shown.id}`} className="btn btn--quiet btn--sm">Programme details</Link>}
          />
          <div className="stack-3">
            {shown.days.map((day) => {
              const slot = shown.schedule.find((s) => s.dayId === day.id)
              const isToday = scheduledToday?.id === day.id
              return (
                <div key={day.id} className="stack-2">
                  <ProgramDayCard program={shown} day={day} week={week} isToday={isToday} onStart={() => start(shown.id, day.id)} />
                  <p className="tiny faint" style={{ paddingLeft: 4 }}>
                    {slot ? `Scheduled ${slot.day} — ${slot.label}` : 'Not tied to a fixed weekday — train it in rotation.'}
                    {isToday ? ' · today' : ''}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="stack-3" aria-labelledby="all-programs">
        <SectionHead id="all-programs" icon="layers" title="All programmes" sub="Transcribed from the programmes/ folder of this repository" />
        <div className="auto-grid" style={{ '--min': '260px' } as React.CSSProperties}>
          {PROGRAMS.map((program) => {
            const locked = !isProgramUnlocked(program, progress.unlockedIds)
            const mine = data.sessions.filter((s) => s.programId === program.id)
            return (
              <Card key={program.id} className={locked ? undefined : 'card--interactive'} pad={false}>
                <div className="card__body stack-3" style={{ padding: 'var(--sp-4)' }}>
                  <div className="row-tight" style={{ minWidth: 0 }}>
                    <Icon name={locked ? 'lock' : 'layers'} size={16} className={locked ? 'faint' : 'accent'} />
                    <h3 className="strong truncate">{program.name}</h3>
                  </div>
                  <p className="tiny muted clamp-2">{program.tagline}</p>
                  <div className="row-2">
                    <Chip>{program.daysPerWeek} d/wk</Chip>
                    <Chip>{program.totalWeeks} wk</Chip>
                    {mine.length > 0 ? <Chip tone="good">{mine.length} logged</Chip> : null}
                  </div>
                  <div className="row-2">
                    <Link to={`/programs/${program.id}`} className="btn btn--quiet btn--sm">
                      Details
                    </Link>
                    {locked ? (
                      <Link to="/unlocks" className="btn btn--ghost btn--sm">
                        <Icon name="lock" size={12} />
                        How to unlock
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => {
                          const day = dayForWeekday(program, weekday) ?? program.days[0]
                          if (day) start(program.id, day.id)
                        }}
                      >
                        <Icon name="play" size={12} />
                        Start
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <div className="grid-2">
        <Card title="Warm-up before you start" icon="sunrise" sub={`${warmup.key} emphasis · ${formatDuration(8)}–10 min`}>
          <div className="stack-4">
            {warmup.stages.map((stage) => (
              <div key={stage.stage} className="stack-2">
                <p className="eyebrow">{stage.stage}</p>
                <ul className="stack-2">
                  {stage.drills.map((d) => (
                    <li key={d.name} className="tiny row-between" style={{ gap: 'var(--sp-3)' }}>
                      <span className="truncate">
                        {d.name} <span className="faint">— {d.purpose}</span>
                      </span>
                      <span className="num faint" style={{ flex: 'none' }}>
                        {d.dose}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {cooldown.length > 0 ? (
              <div className="stack-2">
                <p className="eyebrow">Cool-down · 5 min</p>
                <ul className="stack-2">
                  {cooldown.map((c) => (
                    <li key={c} className="tiny row-tight">
                      <Icon name="check" size={11} className="good" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Link to="/docs/warmup-and-cooldown" className="btn btn--quiet btn--sm">
              <Icon name="note" size={12} />
              Read the full warm-up doc
            </Link>
          </div>
        </Card>
        <PainTriageCard />
      </div>

      <Card title="Last five sessions" icon="history" actions={<Link to="/history" className="btn btn--quiet btn--sm">All {progress.totals.workouts}</Link>}>
        {data.sessions.length === 0 ? (
          <Empty icon="clipboard" title="Nothing logged yet" text="Your first finished session appears here." />
        ) : (
          <ul className="stack-2">
            {[...data.sessions]
              .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
              .slice(0, 5)
              .map((s) => (
                <li key={s.id} className="row-between" style={{ gap: 'var(--sp-3)' }}>
                  <Link to={`/history/${s.id}`} className="small truncate">
                    {s.title}
                  </Link>
                  <span className="tiny faint num" style={{ flex: 'none' }}>
                    {formatDate(s.date, 'short')} · {s.completedSets} sets · {Math.round(s.volumeKg).toLocaleString()} {data.profile.units} ·{' '}
                    {formatDuration(s.durationMin)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <p className="tiny faint center">
        {progress.totals.workouts} {pluralize(progress.totals.workouts, 'session')} ·{' '}
        {progress.totals.distinctExercises} distinct exercises · streak {progress.streak.current}
      </p>
    </div>
  )
}

export default Workouts

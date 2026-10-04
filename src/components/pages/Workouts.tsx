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
      <section className="stack-2" aria-label="Workout visual guide">
        <div
          className="panel workout-hero"
          style={{ overflow: 'hidden', padding: 0, borderRadius: 'var(--radius-lg)' }}
        >
          <img
            src="data:image/jpeg;base64,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"
            alt="Premium workout split overview with realistic exercise visuals for chest, back, legs, shoulders, and arms"
            width="900"
            height="600"
            decoding="async"
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        </div>
      </section>
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

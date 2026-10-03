import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, Meter, SectionHead, KeyValue } from '../ui/primitives'
import { ProgramDayCard, programRequirement, programUsage } from '../workout/ProgramBits'
import { SessionCard } from '../workout/SessionBits'
import { LEVEL_LABELS, PROGRESSION_MODEL_LABELS, getProgram } from '../../data/programs'
import { UNLOCK_MAP } from '../../data/unlocks'
import { unlockRequirementText } from '../../lib/unlocks'
import { useAppState, store } from '../../lib/store'
import { isProgramUnlocked, startProgramDay } from '../../lib/start'
import { dayForWeekday, resolveDayForWeek, weekLabel } from '../../lib/program'
import { formatDate, todayKey, weekdayIndex } from '../../lib/dates'
import { formatDuration, pluralize } from '../../lib/format'
import { toast } from '../ui/Toast'

/** One programme in full: blocks, days, progression rules and your own log against it. */

export function ProgramDetail() {
  const { id = '' } = useParams()
  const { data, progress } = useAppState()
  const navigate = useNavigate()
  const program = getProgram(id)

  const usage = useMemo(() => (program ? programUsage(program, data.sessions, data.preferences.weekStartsOn) : null), [program, data.sessions, data.preferences.weekStartsOn])
  const mine = useMemo(
    () =>
      program
        ? [...data.sessions]
            .filter((s) => s.programId === program.id)
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        : [],
    [program, data.sessions],
  )

  if (!program) {
    return (
      <div className="page">
        <Empty
          icon="layers"
          title="Programme not found"
          text={`There is no programme with the id “${id}”.`}
          action={
            <Link to="/programs" className="btn btn--primary btn--sm">
              All programmes
            </Link>
          }
        />
      </div>
    )
  }

  const locked = !isProgramUnlocked(program, progress.unlockedIds)
  const requirement = programRequirement(program, progress.unlockedIds)
  const unlock = program.unlockId ? UNLOCK_MAP[program.unlockId] : undefined
  const week = usage?.currentWeek ?? 1
  const todayDay = dayForWeekday(program, weekdayIndex(todayKey()))
  const isActive = data.preferences.activeProgramId === program.id

  const start = (dayId: string) => {
    if (locked) {
      toast.warn('That programme is still locked', unlock ? unlockRequirementText(unlock) : undefined)
      navigate('/unlocks')
      return
    }
    if (startProgramDay(program.id, dayId, week, data.preferences.defaultRestSec)) navigate('/session')
  }

  const deloadWeeks = program.blocks.filter((b) => b.deload).flatMap((b) => b.weeks)
  const totalSets = program.days.reduce((n, d) => n + d.exercises.reduce((m, e) => m + e.sets, 0), 0)
  const weekPct = program.totalWeeks > 0 ? Math.min(100, ((week - (usage?.started ? 0 : 1)) / program.totalWeeks) * 100) : 0

  return (
    <div className="page">
      <Card className={locked ? undefined : 'card--glow'}>
        <div className="stack-4">
          <div className="row-between" style={{ gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
            <div className="stack-2" style={{ minWidth: 0 }}>
              <p className="eyebrow row-tight">
                <Icon name={locked ? 'lock' : 'layers'} size={12} />
                {LEVEL_LABELS[program.level]} programme · transcribed from {program.sourceFile}
              </p>
              <h1 className="h2">{program.name}</h1>
              <p className="muted">{program.tagline}</p>
            </div>
            <div className="col items-end" style={{ flex: 'none', textAlign: 'right' }}>
              <span className="h3 num">{program.daysPerWeek}</span>
              <span className="tiny faint">days per week</span>
            </div>
          </div>

          <div className="row-2">
            <Chip icon="calendar">{program.totalWeeks} weeks</Chip>
            <Chip icon="repeat">{totalSets} sets per week</Chip>
            <Chip icon="trending-up">{PROGRESSION_MODEL_LABELS[program.progressionModel]}</Chip>
            {program.equipment.map((e) => (
              <Chip key={e} icon="dumbbell">
                {e}
              </Chip>
            ))}
            {deloadWeeks.length > 0 ? <Chip tone="warn" icon="moon">Deload weeks {deloadWeeks.join(', ')}</Chip> : null}
          </div>

          {locked ? (
            <div className="banner banner--warn">
              <Icon name="lock" size={16} />
              <span>
                <strong>This programme is locked.</strong> {requirement} Everything below is readable now — the lock only applies to
                starting a session from it.
              </span>
            </div>
          ) : null}

          {usage?.started ? (
            <div className="stack-2">
              <div className="row-between tiny">
                <span className="muted">
                  {weekLabel(program, week)} · {usage.sessions} {pluralize(usage.sessions, 'session')} logged
                </span>
                <span className="num faint">{Math.round(weekPct)}%</span>
              </div>
              <Meter pct={weekPct} label={`Progress through ${program.name}`} />
              {usage.lastDate ? <p className="tiny faint">Last trained {formatDate(usage.lastDate, 'medium')}</p> : null}
            </div>
          ) : null}

          <div className="row-2">
            <button type="button" className="btn btn--primary" disabled={locked} onClick={() => start(todayDay?.id ?? program.days[0].id)}>
              <Icon name="play" size={15} />
              {todayDay ? `Start ${todayDay.name.split('—')[0].trim()}` : 'Start day A'}
            </button>
            <button
              type="button"
              className={`btn ${isActive ? 'btn--ghost' : 'btn--ghost'}`}
              onClick={() => {
                store.updatePreferences({ activeProgramId: isActive ? undefined : program.id })
                toast.success(isActive ? 'Active programme cleared' : `${program.name} is now your active programme`)
              }}
            >
              <Icon name={isActive ? 'x' : 'pin'} size={15} />
              {isActive ? 'Not active' : 'Set active'}
            </button>
            <Link to={`/docs/${program.id}`} className="btn btn--quiet">
              <Icon name="note" size={15} />
              Source doc
            </Link>
          </div>
        </div>
      </Card>

      <Card title="Overview" icon="info">
        <div className="stack-3">
          <p className="small">{program.overview}</p>
          <p className="small muted">{program.whyItWorks}</p>
        </div>
      </Card>

      <section className="stack-3" aria-labelledby="days">
        <SectionHead id="days" icon="dumbbell" title="Training days" sub={`${program.days.length} distinct days, rotated ${program.daysPerWeek}× per week`} />
        <div className="stack-3">
          {program.days.map((day) => {
            const resolved = resolveDayForWeek(program.id, day.id, week)
            const slot = program.schedule.find((s) => s.dayId === day.id)
            return (
              <div key={day.id} className="stack-2">
                <ProgramDayCard program={program} day={day} week={week} locked={locked} isToday={todayDay?.id === day.id} onStart={() => start(day.id)} />
                <div className="row-between tiny faint" style={{ paddingLeft: 4 }}>
                  <span>{slot ? `Scheduled ${slot.day} — ${slot.label}` : 'Train in rotation'}</span>
                  <span>
                    {resolved && resolved.loadFactor !== 1 ? `This week: ${Math.round(resolved.loadFactor * 100)}% of usual load · ` : ''}
                    {formatDuration(day.estimatedMin)} estimated
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="stack-3" aria-labelledby="blocks">
        <SectionHead id="blocks" icon="layers" title="Blocks and deloads" sub="What each phase of the programme is for" />
        <div className="stack-3">
          {program.blocks.map((block) => (
            <Card key={block.id} className={block.deload ? undefined : undefined} pad={false}>
              <div className="card__head">
                <div style={{ minWidth: 0 }}>
                  <h3 className="strong truncate row-tight">
                    {block.deload ? <Icon name="moon" size={14} className="warn" /> : null}
                    {block.label}
                  </h3>
                  <p className="tiny faint truncate">
                    Weeks {block.weeks.join(', ')} · {week === block.weeks[0] || block.weeks.includes(week) ? 'you are here' : 'upcoming or past'}
                  </p>
                </div>
                {block.deload ? <Chip tone="warn">Deload</Chip> : null}
              </div>
              <div className="card__body stack-3" style={{ paddingTop: 0 }}>
                <p className="small">{block.headline}</p>
                <p className="tiny muted">{block.detail}</p>
                {block.adjustments && block.adjustments.length > 0 ? (
                  <ul className="stack-2">
                    {block.adjustments.map((a) => (
                      <li key={a} className="tiny row-tight">
                        <Icon name="arrow-right" size={11} className="accent" />
                        {a}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid-2">
        <Card title="Progression rules" icon="trending-up" sub={PROGRESSION_MODEL_LABELS[program.progressionModel]}>
          <div className="stack-3">
            <p className="small muted">{program.progressionSummary}</p>
            <ul className="stack-2">
              {program.progressionRules.map((rule) => (
                <li key={rule} className="small row-tight">
                  <Icon name="check" size={13} className="good" />
                  {rule}
                </li>
              ))}
            </ul>
            {program.increments && program.increments.length > 0 ? (
              <div className="well stack-2" style={{ padding: 'var(--sp-3)' }}>
                <p className="eyebrow">Increments</p>
                <KeyValue rows={program.increments.map((inc) => ({ k: inc.lift, v: inc.amount }))} />
              </div>
            ) : null}
          </div>
        </Card>

        <Card title="Schedule" icon="calendar" sub="The default week, from the source document">
          <div className="stack-3">
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Session</th>
                  </tr>
                </thead>
                <tbody>
                  {program.schedule.map((slot) => (
                    <tr key={`${slot.dayIndex}-${slot.dayId ?? slot.label}`}>
                      <td>{slot.day}</td>
                      <td>{slot.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {program.alternativeSchedules && program.alternativeSchedules.length > 0 ? (
              <div className="stack-2">
                <p className="eyebrow">Alternatives</p>
                <ul className="stack-2">
                  {program.alternativeSchedules.map((alt) => (
                    <li key={alt} className="tiny muted">
                      {alt}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {program.notes.length > 0 ? (
              <div className="stack-2">
                <p className="eyebrow">Notes from the source</p>
                <ul className="stack-2">
                  {program.notes.map((note) => (
                    <li key={note} className="tiny row-tight">
                      <Icon name="info" size={11} className="faint" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <section className="stack-3" aria-labelledby="log">
        <SectionHead
          id="log"
          icon="history"
          title="Your sessions on this programme"
          sub={mine.length > 0 ? `${mine.length} ${pluralize(mine.length, 'session')} logged · week ${week}` : 'None yet — start one above and it will be tracked against this programme'}
        />
        {mine.length === 0 ? (
          <Card>
            <Empty icon="clipboard" title="No sessions logged on this programme" text="Sessions are matched by programme id, so free sessions do not appear here." />
          </Card>
        ) : (
          <div className="stack-3">{mine.slice(0, 8).map((s) => <SessionCard key={s.id} session={s} units={data.profile.units} />)}</div>
        )}
      </section>
    </div>
  )
}

export default ProgramDetail

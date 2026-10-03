import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, Meter, SectionHead, Stat } from '../ui/primitives'
import { BarChart } from '../charts'
import {
  LevelCard,
  ProgressHeadline,
  RecentRecords,
  StreakCard,
  WeekDots,
  XpRecent,
} from '../gamification'
import { SessionCard } from '../workout/SessionBits'
import { ProgramDayCard } from '../workout/ProgramBits'
import { AchievementCard } from '../gamification/Achievements'
import { ACHIEVEMENTS } from '../../data/achievements'
import { goalProgress } from '../../lib/goals'
import { useAppState, store } from '../../lib/store'
import { startFreeSession, startProgramDay, todayPlan } from '../../lib/start'
import { frequencyStats, periodDelta } from '../../lib/analytics'
import { recentPrEvents } from '../../lib/prs'
import { formatDate, todayKey } from '../../lib/dates'
import { formatDuration, pluralize } from '../../lib/format'

/**
 * The landing page.
 *
 * Every number here is derived from logged sessions: XP, level, streak, weekly
 * activity, records and goal progress. There is no seeded demo data and nothing
 * animates upwards on its own.
 */

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Late session'
}

export function Dashboard() {
  const { data, progress, draft } = useAppState()
  const navigate = useNavigate()
  const units = data.profile.units
  const name = data.profile.displayName.trim()

  const plan = useMemo(() => todayPlan(data, progress.unlockedIds), [data, progress.unlockedIds])
  const delta = useMemo(() => periodDelta(data.sessions, 7), [data.sessions])
  const freq = useMemo(() => frequencyStats(data.sessions, data.preferences.weekStartsOn), [data.sessions, data.preferences.weekStartsOn])
  const prEvents = useMemo(() => recentPrEvents(data.sessions, 6), [data.sessions])
  const recentSessions = useMemo(
    () => [...data.sessions].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.completedAt || '').localeCompare(a.completedAt || '')).slice(0, 3),
    [data.sessions],
  )

  const activeGoals = useMemo(
    () =>
      data.goals
        .filter((g) => !g.completedAt && !g.abandonedAt)
        .map((g) => goalProgress(g, { sessions: data.sessions, progress, profile: data.profile }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3),
    [data.goals, data.sessions, progress],
  )

  const nearestAchievements = useMemo(() => {
    const byId = new Map(progress.achievements.map((s) => [s.id, s]))
    return ACHIEVEMENTS.filter((a) => !byId.get(a.id)?.unlocked)
      .map((a) => ({ achievement: a, state: byId.get(a.id) }))
      .filter((row) => row.state && row.state.target > 1 && row.state.progress / row.state.target >= 0.4)
      .sort((a, b) => (b.state!.progress / b.state!.target) - (a.state!.progress / a.state!.target))
      .slice(0, 3)
  }, [progress.achievements])

  const weeklyBars = progress.weekly.slice(-8).map((w) => ({
    label: w.label,
    value: w.workouts,
    meta: `${w.sets} sets · ${Math.round(w.volumeKg).toLocaleString()} ${units}`,
  }))

  const startToday = () => {
    if (draft) {
      navigate('/session')
      return
    }
    if (plan.kind === 'scheduled') {
      const created = startProgramDay(plan.program.id, plan.day.id, plan.week, data.preferences.defaultRestSec)
      if (created) {
        navigate('/session')
        return
      }
    }
    startFreeSession()
    navigate('/session')
  }

  return (
    <div className="page">
      {/* ---------------------------------------------------------- hero ---- */}
      <Card className="card--glow">
        <div className="stack-4">
          <div className="row-between" style={{ gap: 'var(--sp-4)', alignItems: 'flex-start' }}>
            <div className="stack-2" style={{ minWidth: 0 }}>
              <p className="eyebrow">
                {formatDate(todayKey(), 'long')}
              </p>
              <h1 className="h2">
                {greeting()}
                {name ? `, ${name.split(' ')[0]}` : ''}.
              </h1>
              <ProgressHeadline progress={progress} />
            </div>
            <div className="col items-end" style={{ flex: 'none', textAlign: 'right' }}>
              <span className="h3 num" style={{ color: 'var(--accent)' }}>
                {progress.level.xp.toLocaleString()}
              </span>
              <span className="tiny faint">total XP · level {progress.level.level}</span>
            </div>
          </div>

          {draft ? (
            <div className="banner banner--accent">
              <Icon name="play" size={16} />
              <span>
                <strong>A session is in progress.</strong> {draft.title} —{' '}
                {draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0)} sets done so far.
              </span>
              <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/session')}>
                Resume
              </button>
            </div>
          ) : null}

          <div className="row-2">
            <button type="button" className="btn btn--primary" onClick={startToday}>
              <Icon name={draft ? 'play' : 'zap'} size={16} />
              {draft ? 'Resume session' : plan.kind === 'scheduled' ? `Start ${plan.day.name.split('—')[0].trim()}` : 'Start a free session'}
            </button>
            <Link to="/programs" className="btn btn--ghost">
              <Icon name="layers" size={15} />
              Programmes
            </Link>
            <Link to="/exercises" className="btn btn--quiet">
              <Icon name="book" size={15} />
              Library
            </Link>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------- today's plan ---- */}
      {plan.kind === 'scheduled' ? (
        <section className="stack-3" aria-labelledby="today-plan">
          <SectionHead
            id="today-plan"
            icon="calendar-check"
            title={plan.onSchedule ? "Today's workout" : 'Next workout'}
            sub={`${plan.program.name} · ${plan.reason}${plan.resolved.deload ? ' · deload week — lighter loads on purpose' : ''}`}
            actions={<Link to={`/programs/${plan.program.id}`} className="btn btn--quiet btn--sm">Full programme</Link>}
          />
          <ProgramDayCard
            program={plan.program}
            day={plan.day}
            week={plan.week}
            isToday={plan.onSchedule}
            onStart={startToday}
          />
        </section>
      ) : (
        <Card>
          <Empty
            icon="moon"
            title={plan.kind === 'rest' ? 'Scheduled rest day' : 'Nothing planned for today'}
            text={
              plan.kind === 'rest'
                ? `${plan.reason} Recovery is part of the programme — mobility, a walk or nothing at all are all correct answers.`
                : `${plan.reason} You can still log a free session, and it will count towards your streak and XP.`
            }
            action={
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { startFreeSession(); navigate('/session') }}>
                <Icon name="plus" size={14} />
                Log a free session
              </button>
            }
          />
        </Card>
      )}

      {/* -------------------------------------------------- level/streak --- */}
      <div className="grid-2">
        <LevelCard level={progress.level} xp={progress.xp} />
        <StreakCard streak={progress.streak} weekly={progress.weekly} />
      </div>

      {/* ------------------------------------------------------- this week -- */}
      <section className="stack-3" aria-labelledby="week">
        <SectionHead
          id="week"
          icon="chart"
          title="This week vs last"
          sub={`Trained ${freq.currentWeekCount} ${pluralize(freq.currentWeekCount, 'time')} this week · ${freq.perActiveWeek.toFixed(1)} per active week overall`}
          actions={<Link to="/analytics" className="btn btn--quiet btn--sm">Analytics</Link>}
        />
        <div className="grid-4">
          <Stat
            label="Workouts"
            value={delta.workouts.current}
            icon="dumbbell"
            delta={delta.workouts.pct !== null ? `${delta.workouts.pct > 0 ? '+' : ''}${delta.workouts.pct}%` : undefined}
            deltaDir={delta.workouts.pct === null ? undefined : delta.workouts.pct > 0 ? 'up' : delta.workouts.pct < 0 ? 'down' : 'flat'}
            hint="Compared with the previous 7 days"
          />
          <Stat
            label="Volume"
            value={delta.volume.current.toLocaleString()}
            unit={units}
            icon="layers"
            delta={delta.volume.pct !== null ? `${delta.volume.pct > 0 ? '+' : ''}${delta.volume.pct}%` : undefined}
            deltaDir={delta.volume.pct === null ? undefined : delta.volume.pct > 0 ? 'up' : delta.volume.pct < 0 ? 'down' : 'flat'}
          />
          <Stat
            label="Sets"
            value={delta.sets.current}
            icon="repeat"
            delta={delta.sets.pct !== null ? `${delta.sets.pct > 0 ? '+' : ''}${delta.sets.pct}%` : undefined}
            deltaDir={delta.sets.pct === null ? undefined : delta.sets.pct > 0 ? 'up' : delta.sets.pct < 0 ? 'down' : 'flat'}
          />
          <Stat label="Time" value={formatDuration(delta.duration.current)} icon="clock" />
        </div>
        <Card title="Sessions per week" icon="chart" sub="Only weeks you actually trained are counted">
          <div className="stack-4">
            <WeekDots weekly={progress.weekly} weekStartsOn={data.preferences.weekStartsOn} />
            <BarChart data={weeklyBars} height={160} ariaLabel="Sessions completed in each of your last 8 training weeks" />
          </div>
        </Card>
      </section>

      {/* --------------------------------------------------- recent work --- */}
      <section className="stack-3" aria-labelledby="recent">
        <SectionHead
          id="recent"
          icon="history"
          title="Recent workouts"
          sub={`${progress.totals.workouts} ${pluralize(progress.totals.workouts, 'session')} logged all time`}
          actions={<Link to="/history" className="btn btn--quiet btn--sm">All history</Link>}
        />
        {recentSessions.length === 0 ? (
          <Card>
            <Empty
              icon="clipboard"
              title="No workouts logged yet"
              text="Finish your first session and this page fills with real numbers — XP, streak, records and charts."
              action={
                <button type="button" className="btn btn--primary btn--sm" onClick={startToday}>
                  Start now
                </button>
              }
            />
          </Card>
        ) : (
          <div className="stack-3">{recentSessions.map((s) => <SessionCard key={s.id} session={s} units={units} />)}</div>
        )}
      </section>

      {/* ------------------------------------------------------- records --- */}
      <section className="stack-3" aria-labelledby="records">
        <SectionHead
          id="records"
          icon="trophy"
          title="Personal records"
          sub={`${progress.prCount} ${pluralize(progress.prCount, 'record')} beaten across your log`}
          actions={<Link to="/analytics" className="btn btn--quiet btn--sm">See all</Link>}
        />
        <RecentRecords
          events={prEvents}
          limit={6}
          emptyAction={
            <Link to="/exercises" className="btn btn--ghost btn--sm">
              Browse exercises
            </Link>
          }
        />
      </section>

      {/* --------------------------------------------------------- goals --- */}
      <section className="stack-3" aria-labelledby="goals">
        <SectionHead
          id="goals"
          icon="target"
          title="Goals in progress"
          sub={`${data.goals.filter((g) => !g.completedAt && !g.abandonedAt).length} active · ${progress.totals.goalsCompleted} completed`}
          actions={<Link to="/goals" className="btn btn--quiet btn--sm">Manage</Link>}
        />
        {activeGoals.length === 0 ? (
          <Card>
            <Empty
              icon="target"
              title="No active goals"
              text="Goals come from the goals.md handbook — set one and its progress updates from your logged sessions."
              action={
                <Link to="/goals" className="btn btn--ghost btn--sm">
                  Create a goal
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="stack-3">
            {activeGoals.map(({ goal, pct, current, target, needed, unit }) => (
              <Card key={goal.id} pad={false}>
                <div className="card__head">
                  <div style={{ minWidth: 0 }}>
                    <Link to="/goals" className="strong truncate" style={{ display: 'block', color: 'var(--text)' }}>
                      {goal.title}
                    </Link>
                    <p className="tiny faint truncate">
                      {current} / {target} {unit}
                      {goal.dueAt ? ` · due ${formatDate(goal.dueAt, 'medium')}` : ''}
                      {needed > 0 ? ` · ${needed} ${unit} to go` : ''}
                    </p>
                  </div>
                  <span className="num strong" style={{ color: 'var(--accent)', flex: 'none' }}>
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="card__body" style={{ paddingTop: 0 }}>
                  <Meter pct={pct} height="thin" label={`Progress towards ${goal.title}`} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* -------------------------------------------------- achievements --- */}
      {nearestAchievements.length > 0 ? (
        <section className="stack-3" aria-labelledby="close">
          <SectionHead
            id="close"
            icon="award"
            title="Almost there"
            sub="Unlocked by real activity — no timers, no random drops"
            actions={<Link to="/achievements" className="btn btn--quiet btn--sm">All {ACHIEVEMENTS.length}</Link>}
          />
          <div className="grid-3">
            {nearestAchievements.map(({ achievement, state }) => (
              <AchievementCard key={achievement.id} achievement={achievement} state={state} size="sm" />
            ))}
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------- ledger --- */}
      <div className="grid-2">
        <XpRecent events={progress.xpEvents} limit={7} />
        <Card
          title="All-time totals"
          icon="database"
          actions={<Link to="/profile" className="btn btn--quiet btn--sm">Profile</Link>}
        >
          <div className="grid-2">
            <Stat label="Workouts" value={progress.totals.workouts} icon="dumbbell" size="sm" />
            <Stat label="Sets" value={progress.totals.sets.toLocaleString()} icon="repeat" size="sm" />
            <Stat label="Volume" value={Math.round(progress.totals.volumeKg).toLocaleString()} unit={units} icon="layers" size="sm" />
            <Stat label="Time" value={formatDuration(progress.totals.durationMin)} icon="clock" size="sm" />
            <Stat label="Exercises" value={progress.totals.distinctExercises} icon="book" size="sm" />
            <Stat label="Achievements" value={`${progress.achievements.filter((a) => a.unlocked).length}/${ACHIEVEMENTS.length}`} icon="award" size="sm" />
          </div>
          {progress.totals.firstWorkoutAt ? (
            <p className="tiny faint" style={{ marginTop: 'var(--sp-3)' }}>
              Training since {formatDate(progress.totals.firstWorkoutAt, 'medium')} ·{' '}
              {progress.unlockEvents.length} {pluralize(progress.unlockEvents.length, 'unlock')} earned
            </p>
          ) : null}
        </Card>
      </div>

      {data.sessions.length === 0 ? (
        <Card title="How this works" icon="info">
          <ul className="stack-3">
            {[
              'Log a session — sets, reps, weight and an optional RPE. The app never invents numbers for you.',
              'XP is awarded from what you actually completed: harder movements, higher effort and more volume earn more.',
              'Your streak counts distinct days you trained. Records are detected automatically when you beat a previous best.',
              'Achievements and unlocks are earned by that same activity. Delete a session and everything it awarded goes with it.',
            ].map((line, i) => (
              <li key={i} className="row-tight small">
                <span className="badge badge--accent num" style={{ flex: 'none' }}>
                  {i + 1}
                </span>
                {line}
              </li>
            ))}
          </ul>
          <div className="row-2" style={{ marginTop: 'var(--sp-4)' }}>
            <Link to="/docs/getting-started" className="btn btn--ghost btn--sm">
              <Icon name="note" size={13} />
              Read the handbook
            </Link>
            <button
              type="button"
              className="btn btn--quiet btn--sm"
              onClick={() => store.updatePreferences({ activeProgramId: 'beginner-full-body' })}
            >
              Set the beginner programme as active
            </button>
          </div>
        </Card>
      ) : null}

      <p className="tiny faint center">
        <Chip icon="shield-check">Everything on this page is derived from your own log</Chip>
      </p>
    </div>
  )
}

export default Dashboard

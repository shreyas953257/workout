import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Meter, Ring, Stat } from '../ui/primitives'
import { TIER_COLORS } from '../../data/themes'
import { STREAK_MILESTONES } from '../../data/xp'
import { levelTable, titleForLevel, xpToReachLevel } from '../../data/levels'
import { nextStreakMilestone } from '../../lib/streaks'
import { formatCompact, pluralize } from '../../lib/format'
import { relativeDay } from '../../lib/dates'
import type { LevelInfo, ProgressSnapshot, StreakInfo } from '../../types'

/**
 * The gamification furniture: level, XP and streak.
 *
 * Every number here is read straight from the replay snapshot — nothing is
 * estimated, seeded or animated into existence. If the user has not trained,
 * these components say so plainly.
 */

/* --------------------------------------------------------------------------
   Level
   -------------------------------------------------------------------------- */

export function LevelRing({ level, size = 116, showTitle = true }: { level: LevelInfo; size?: number; showTitle?: boolean }) {
  // LevelInfo carries the title but not the tier, so look the tier up by level.
  const tier = TIER_COLORS[titleForLevel(level.level).tier] ?? TIER_COLORS.bronze
  return (
    <div className="row" style={{ gap: 'var(--sp-4)' }}>
      <Ring pct={level.pct} size={size} stroke={Math.max(8, size / 12)} label={`Progress to level ${level.level + 1}`}>
        <span className="eyebrow">Level</span>
        <span className="h3 num" style={{ lineHeight: 1 }}>
          {level.level}
        </span>
        {showTitle ? <span className="tiny faint">{Math.round(level.pct)}%</span> : null}
      </Ring>
      <div className="stack-2 grow" style={{ minWidth: 0 }}>
        <span
          className="chip"
          style={{
            background: `linear-gradient(120deg, ${tier.from}, ${tier.to})`,
            color: '#14100c',
            border: 'none',
            fontWeight: 700,
            width: 'fit-content',
            boxShadow: `0 0 22px -6px ${tier.glow}`,
          }}
        >
          <Icon name="crown" size={12} />
          {level.title}
        </span>
        <span className="h4 num">{level.xp.toLocaleString()} XP</span>
        <span className="tiny muted">
          {level.needed > 0 ? (
            <>
              <strong className="num">{level.needed.toLocaleString()}</strong> XP to level {level.level + 1}
            </>
          ) : (
            'Levelling up now'
          )}
        </span>
        <Meter pct={level.pct} height="thin" label="Level progress" />
      </div>
    </div>
  )
}

export function LevelCard({ level, xp, compact = false }: { level: LevelInfo; xp: number; compact?: boolean }) {
  if (compact) return <LevelRing level={level} size={92} />
  return (
    <Card glow topline className="stack-4">
      <LevelRing level={level} />
      <div className="auto-grid" style={{ '--min': '130px' } as React.CSSProperties}>
        <Stat label="Total XP" value={xp.toLocaleString()} icon="spark" size="sm" />
        <Stat label="Next level" value={xpToReachLevel(level.level + 1).toLocaleString()} unit="XP" icon="arrow-up" size="sm" />
        <Stat label="Rank" value={titleForLevel(level.level).tier} icon="crown" size="sm" />
      </div>
      <details className="well" style={{ padding: 'var(--sp-3)' }}>
        <summary className="tiny muted" style={{ cursor: 'pointer' }}>
          Level curve — how much XP each level costs
        </summary>
        <div className="table-wrap" style={{ marginTop: 'var(--sp-3)', border: 0, background: 'transparent' }}>
          <table className="table table--tight">
            <thead>
              <tr>
                <th>Level</th>
                <th className="num-col">Total XP</th>
                <th className="num-col">This level</th>
                <th>Title</th>
              </tr>
            </thead>
            <tbody>
              {levelTable(16).map((row) => (
                <tr key={row.level} style={row.level === level.level ? { background: 'var(--accent-soft)' } : undefined}>
                  <td className="num strong">{row.level}</td>
                  <td className="num-col">{row.xp.toLocaleString()}</td>
                  <td className="num-col faint">{(row.xp - xpToReachLevel(row.level - 1 || 1)).toLocaleString()}</td>
                  <td className="muted">{row.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  )
}

/* --------------------------------------------------------------------------
   Streak
   -------------------------------------------------------------------------- */

export function StreakCard({ streak, weekly }: { streak: StreakInfo; weekly: ProgressSnapshot['weekly'] }) {
  const next = nextStreakMilestone(streak.current)
  // nextStreakMilestone returns the *distance* to the next milestone.
  const milestone = next ? streak.current + next.days : 0
  const atRisk = streak.current > 0 && !streak.currentIncludingToday
  const lastWeek = weekly[weekly.length - 1]
  const days = lastWeek ? lastWeek.workouts : 0

  return (
    <Card
      className="stack-4"
      title="Streak"
      icon="flame"
      sub={
        streak.current > 0
          ? atRisk
            ? 'Train today to keep it alive'
            : `Trained today — ${streak.current} in a row`
          : streak.longest > 0
            ? `Longest run: ${streak.longest} days`
            : 'Complete a workout to start one'
      }
      actions={
        streak.current > 0 ? (
          <span className="hero-num grad-text" style={{ fontSize: 'var(--fs-3xl)' }}>
            {streak.current}
          </span>
        ) : null
      }
    >
      <div className="auto-grid" style={{ '--min': '120px' } as React.CSSProperties}>
        <Stat label="Current" value={streak.current} unit={pluralize(streak.current, 'day')} icon="flame" size="sm" />
        <Stat label="Longest" value={streak.longest} unit={pluralize(streak.longest, 'day')} icon="trophy" size="sm" />
        <Stat label="Days trained" value={streak.totalDays} icon="calendar-check" size="sm" />
      </div>

      {atRisk ? (
        <div className="banner banner--warn">
          <Icon name="alert-triangle" size={16} />
          <span>
            Your last session was {streak.lastWorkoutDate ? relativeDay(streak.lastWorkoutDate) : 'a while ago'}. One workout today keeps the{' '}
            {streak.current}-day run going.
          </span>
        </div>
      ) : null}

      {next ? (
        <div className="stack-2">
          <div className="row-between tiny">
            <span className="muted">
              Next milestone · {milestone} days → <strong className="accent num">+{next.bonus}</strong> XP
            </span>
            <span className="num faint">{next.days} to go</span>
          </div>
          <Meter
            pct={(streak.current / milestone) * 100}
            height="thin"
            label={`Progress to the ${milestone}-day streak`}
          />
        </div>
      ) : (
        <p className="tiny faint">
          You have passed every streak milestone on the table — {STREAK_MILESTONES.length} of them.
        </p>
      )}

      <div className="row-between tiny faint">
        <span>This week: {days} {pluralize(days, 'session')}</span>
        <Link to="/calendar">Calendar →</Link>
      </div>
    </Card>
  )
}

/** Seven dots for the current week — the smallest honest activity signal. */
export function WeekDots({ weekly, weekStartsOn = 1 }: { weekly: ProgressSnapshot['weekly']; weekStartsOn?: 0 | 1 }) {
  const week = weekly[weekly.length - 1]
  const labels = weekStartsOn === 1 ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return (
    <div className="row-tight" style={{ gap: 6 }} title={week ? `${week.label}: ${week.workouts} sessions` : 'No sessions yet'}>
      {labels.map((_label, i) => {
        const filled = week ? Math.min(week.workouts, 7) > i : false
        return (
          <span
            key={i}
            aria-hidden
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: filled ? 'var(--accent)' : 'var(--surface-3)',
              boxShadow: filled ? '0 0 8px var(--accent-glow)' : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------------------
   Headline numbers
   -------------------------------------------------------------------------- */

export function ProgressHeadline({ progress }: { progress: ProgressSnapshot }) {
  const t = progress.totals
  return (
    <div className="auto-grid" style={{ '--min': '150px' } as React.CSSProperties}>
      <Card pad="tight" className="card--pad">
        <Stat label="Workouts" value={t.workouts} icon="dumbbell" />
      </Card>
      <Card pad="tight" className="card--pad">
        <Stat label="Sets logged" value={formatCompact(t.sets)} icon="layers" />
      </Card>
      <Card pad="tight" className="card--pad">
        <Stat label="Volume" value={formatCompact(Math.round(t.volumeKg))} unit="kg" icon="weight" />
      </Card>
      <Card pad="tight" className="card--pad">
        <Stat label="Time" value={formatCompact(Math.round(t.durationMin / 6) / 10)} unit="h" icon="clock" />
      </Card>
      <Card pad="tight" className="card--pad">
        <Stat label="Records" value={progress.prCount} icon="star" />
      </Card>
      <Card pad="tight" className="card--pad">
        <Stat label="Achievements" value={`${progress.achievements.filter((a) => a.unlocked).length}`} unit={`/ ${progress.achievements.length}`} icon="trophy" />
      </Card>
    </div>
  )
}

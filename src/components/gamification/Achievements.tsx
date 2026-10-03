import { Icon, type IconName } from '../ui/Icon'
import { Card, Meter } from '../ui/primitives'
import { TIER_COLORS } from '../../data/themes'
import { describeProgress } from '../../lib/achievements'
import { formatDate, toDateKey } from '../../lib/dates'
import type { Achievement, AchievementState } from '../../types'

/**
 * Achievements.
 *
 * A locked achievement shows exactly what is missing and how far away it is; an
 * unlocked one shows when it happened and which session caused it. Both come
 * from the replay, so there is nothing to reconcile and nothing to fake.
 */

const CATEGORY_ICON: Record<string, IconName> = {
  volume: 'weight',
  consistency: 'calendar-check',
  strength: 'dumbbell',
  milestone: 'flag',
  exploration: 'compass',
  discipline: 'shield',
}

export function tierStyle(tier: string): React.CSSProperties {
  const t = TIER_COLORS[tier] ?? TIER_COLORS.bronze
  return {
    background: `linear-gradient(140deg, ${t.from}, ${t.to})`,
    boxShadow: `0 0 22px -6px ${t.glow}`,
  }
}

export function AchievementCard({
  achievement,
  state,
  size = 'md',
}: {
  achievement: Achievement
  state?: AchievementState
  size?: 'sm' | 'md'
}) {
  const unlocked = state?.unlocked ?? false
  const tier = TIER_COLORS[achievement.tier] ?? TIER_COLORS.bronze
  const progress = state?.progress ?? 0
  const target = state?.target ?? 1
  const pct = unlocked ? 100 : target > 0 ? Math.max(0, Math.min(100, (progress / target) * 100)) : 0
  const dateKey = state?.unlockedAt ? toDateKey(state.unlockedAt) : ''

  return (
    <Card
      pad={size === 'sm' ? 'tight' : true}
      className={size === 'sm' ? 'card--pad' : undefined}
      style={{ opacity: unlocked ? 1 : 0.86 } as React.CSSProperties}
    >
      <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
        <span
          className="empty__icon"
          style={{
            width: size === 'sm' ? 38 : 46,
            height: size === 'sm' ? 38 : 46,
            borderRadius: 13,
            color: unlocked ? '#17110a' : 'var(--text-faint)',
            ...(unlocked ? tierStyle(achievement.tier) : { background: 'var(--surface-2)', boxShadow: 'none' }),
          }}
          aria-hidden
        >
          <Icon name={unlocked ? achievement.icon : CATEGORY_ICON[achievement.category] ?? 'lock'} size={size === 'sm' ? 18 : 21} />
        </span>

        <div className="stack-2 grow" style={{ minWidth: 0 }}>
          <div className="row-between" style={{ gap: 'var(--sp-2)' }}>
            <h3 className={`strong truncate ${size === 'sm' ? 'small' : ''}`} title={achievement.name}>
              {achievement.name}
            </h3>
            <span className="chip" style={{ flex: 'none', borderColor: unlocked ? tier.from : undefined, color: unlocked ? tier.from : undefined }}>
              <Icon name={unlocked ? 'check' : 'lock'} size={11} />
              {achievement.xp} XP
            </span>
          </div>

          <p className="tiny muted clamp-2">{achievement.description}</p>

          {unlocked ? (
            <p className="tiny" style={{ color: tier.from }}>
              <Icon name="calendar-check" size={11} style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 4 }} />
              {dateKey ? formatDate(dateKey, 'medium') : 'Unlocked'}
              {state?.reason ? <span className="faint"> · {state.reason}</span> : null}
            </p>
          ) : (
            <div className="stack-2">
              <Meter pct={pct} height="thin" glow={false} label={`${achievement.name} progress`} />
              <p className="tiny faint">
                {achievement.requirement} ·{' '}
                <span className="num">
                  {describeProgress(achievement, { met: false, progress, target })}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function AchievementSummary({ states }: { states: AchievementState[] }) {
  const unlocked = states.filter((s) => s.unlocked).length
  const total = states.length
  const pct = total > 0 ? (unlocked / total) * 100 : 0
  return (
    <Card className="stack-3" glow>
      <div className="row-between">
        <div>
          <p className="eyebrow">Collection</p>
          <p className="h3 num">
            {unlocked} <span className="muted" style={{ fontSize: 'var(--fs-lg)' }}>/ {total}</span>
          </p>
        </div>
        <span className="chip chip--accent">
          <Icon name="trophy" size={12} />
          {Math.round(pct)}% complete
        </span>
      </div>
      <Meter pct={pct} label="Achievements unlocked" ticks />
    </Card>
  )
}

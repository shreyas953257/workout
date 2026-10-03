import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, Meter, SectionHead, Segmented, Stat } from '../ui/primitives'
import { AchievementCard, AchievementSummary } from '../gamification/Achievements'
import { ACHIEVEMENTS, TOTAL_ACHIEVEMENT_XP } from '../../data/achievements'
import { TIER_COLORS } from '../../data/themes'
import { useAppState } from '../../lib/store'
import { formatDate } from '../../lib/dates'
import { toast } from '../ui/Toast'
import type { Achievement } from '../../types'

type AchievementTier = Achievement['tier']

type Filter = 'all' | 'unlocked' | 'locked' | 'closest'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unlocked', label: 'Unlocked' },
  { value: 'locked', label: 'Still locked' },
  { value: 'closest', label: 'Closest' },
]

const TIERS: AchievementTier[] = ['bronze', 'silver', 'gold', 'platinum', 'mythic']

/** 46 achievements, every one triggered by something you actually did. */

export function Achievements() {
  const { data, progress } = useAppState()
  const [filter, setFilter] = useState<Filter>('all')
  const [tier, setTier] = useState<AchievementTier | 'any'>('any')

  const byId = useMemo(() => new Map(progress.achievements.map((s) => [s.id, s])), [progress.achievements])
  const unlocked = progress.achievements.filter((s) => s.unlocked)
  const xpEarned = useMemo(
    () => ACHIEVEMENTS.filter((a) => byId.get(a.id)?.unlocked).reduce((n, a) => n + a.xp, 0),
    [byId],
  )

  const rows = useMemo(() => {
    let list = ACHIEVEMENTS.map((a) => ({ achievement: a, state: byId.get(a.id) }))
    if (tier !== 'any') list = list.filter((r) => r.achievement.tier === tier)
    if (filter === 'unlocked') list = list.filter((r) => r.state?.unlocked)
    if (filter === 'locked') list = list.filter((r) => !r.state?.unlocked)
    if (filter === 'closest') {
      list = list
        .filter((r) => !r.state?.unlocked && (r.state?.target ?? 1) > 1)
        .sort((a, b) => (b.state!.progress / b.state!.target) - (a.state!.progress / a.state!.target))
    }
    return list
  }, [byId, filter, tier])

  const byTier = useMemo(
    () =>
      TIERS.map((t) => {
        const all = ACHIEVEMENTS.filter((a) => a.tier === t)
        const done = all.filter((a) => byId.get(a.id)?.unlocked)
        return { tier: t, total: all.length, done: done.length, xp: all.reduce((n, a) => n + a.xp, 0) }
      }),
    [byId],
  )

  const recent = useMemo(
    () =>
      [...unlocked]
        .filter((s) => s.unlockedAt)
        .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))
        .slice(0, 5),
    [unlocked],
  )

  return (
    <div className="page">
      <SectionHead
        icon="award"
        title="Achievements"
        sub={`${unlocked.length} of ${ACHIEVEMENTS.length} unlocked · ${xpEarned.toLocaleString()} of ${TOTAL_ACHIEVEMENT_XP.toLocaleString()} XP banked from achievements`}
        actions={
          <Link to="/unlocks" className="btn btn--quiet btn--sm">
            <Icon name="unlock" size={13} />
            Unlocks
          </Link>
        }
      />

      <AchievementSummary states={progress.achievements} />

      <div className="grid-4">
        {byTier.map(({ tier: t, total, done, xp }) => {
          const colours = TIER_COLORS[t] ?? TIER_COLORS.bronze
          return (
            <Card key={t} pad={false}>
              <div className="card__body stack-2" style={{ padding: 'var(--sp-4)' }}>
                <div className="row-between">
                  <span className="strong capitalize">{t}</span>
                  <span className="num faint">
                    {done}/{total}
                  </span>
                </div>
                <div
                  className="meter"
                  aria-hidden="true"
                  style={{ background: `linear-gradient(90deg, ${colours.from}, ${colours.to})`, height: 4, borderRadius: 4, width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                />
                <span className="tiny faint">{xp.toLocaleString()} XP available in this tier</span>
                <button
                  type="button"
                  className={`chip ${tier === t ? 'is-on' : ''}`}
                  aria-pressed={tier === t}
                  onClick={() => setTier(tier === t ? 'any' : t)}
                >
                  {tier === t ? 'Filtering this tier' : 'Filter by this tier'}
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      {recent.length > 0 ? (
        <Card title="Recently unlocked" icon="spark" sub="Newest first — the same order they were earned in">
          <ul className="stack-2">
            {recent.map((state) => {
              const achievement = ACHIEVEMENTS.find((a) => a.id === state.id)
              if (!achievement) return null
              return (
                <li key={state.id} className="row-between" style={{ gap: 'var(--sp-3)' }}>
                  <span className="row-tight" style={{ minWidth: 0 }}>
                    <Icon name="trophy" size={13} className="accent" />
                    <span className="truncate">{achievement.name}</span>
                  </span>
                  <span className="tiny faint num" style={{ flex: 'none' }}>
                    {state.unlockedAt ? formatDate(state.unlockedAt.slice(0, 10), 'medium') : ''} · {achievement.xp} XP
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      ) : null}

      <div className="row-between" style={{ gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <Segmented ariaLabel="Achievement filter" options={FILTERS} value={filter} onChange={(v) => setFilter(v as Filter)} />
        <button
          type="button"
          className="btn btn--quiet btn--sm"
          onClick={() => {
            const locked = ACHIEVEMENTS.filter((a) => !byId.get(a.id)?.unlocked && (byId.get(a.id)?.target ?? 1) > 1)
            const next = locked
              .map((a) => {
                const state = byId.get(a.id)!
                return { a, pct: state.progress / state.target }
              })
              .sort((x, y) => y.pct - x.pct)[0]
            if (next) toast.info(`Closest: ${next.a.name}`, `${next.a.description} — ${Math.round(next.pct * 100)}% there.`)
            else toast.info('Nothing close yet', 'Log a few more sessions and achievements will start falling.')
          }}
        >
          <Icon name="target" size={13} />
          What is closest?
        </button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <Empty
            icon="award"
            title={filter === 'unlocked' ? 'Nothing unlocked in this tier yet' : 'Nothing matches'}
            text="Achievements are earned, never granted. Change the filter, or go and earn one."
            action={
              <Link to="/workouts" className="btn btn--ghost btn--sm">
                Start a session
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="auto-grid" style={{ '--min': '270px' } as React.CSSProperties}>
          {rows.map(({ achievement, state }) => (
            <AchievementCard key={achievement.id} achievement={achievement} state={state} />
          ))}
        </div>
      )}

      <Card title="How unlocking works" icon="info" sub="So nothing here feels random">
        <ul className="stack-2">
          <li className="small row-tight">
            <Icon name="check" size={13} className="good" />
            Conditions are read from your stored sessions — counts, volume, streaks, records, deloads, time of day, programme blocks.
          </li>
          <li className="small row-tight">
            <Icon name="check" size={13} className="good" />
            They are re-evaluated every time your log changes, so deleting a session can take an achievement back.
          </li>
          <li className="small row-tight">
            <Icon name="check" size={13} className="good" />
            Sessions with no completed sets do not count towards anything, including achievements.
          </li>
          <li className="small row-tight">
            <Icon name="check" size={13} className="good" />
            XP from achievements is paid once, at the moment the condition first becomes true.
          </li>
        </ul>
        <div className="row-2" style={{ marginTop: 'var(--sp-4)' }}>
          <Link to="/unlocks" className="btn btn--quiet btn--sm">
            Unlock history
          </Link>
          <Link to="/analytics" className="btn btn--quiet btn--sm">
            See the numbers behind them
          </Link>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Progress towards the next one" icon="target">
          {progress.achievements.filter((s) => !s.unlocked && s.target > 1).length === 0 ? (
            <Empty icon="trophy" title="Everything is unlocked" text="Every achievement in the catalogue has been earned. That is a serious log." />
          ) : (
            <ul className="stack-3">
              {progress.achievements
                .filter((s) => !s.unlocked && s.target > 1)
                .sort((a, b) => b.progress / b.target - a.progress / a.target)
                .slice(0, 6)
                .map((state) => {
                  const achievement = ACHIEVEMENTS.find((a) => a.id === state.id)
                  return (
                    <li key={state.id} className="stack-2">
                      <div className="row-between tiny">
                        <span className="truncate">{achievement?.name ?? state.id}</span>
                        <span className="num faint">
                          {state.progress} / {state.target}
                        </span>
                      </div>
                      <Meter pct={(state.progress / state.target) * 100} height="thin" label={achievement?.name ?? state.id} />
                    </li>
                  )
                })}
            </ul>
          )}
        </Card>
        <Card title="Catalogue" icon="book">
          <div className="grid-2">
            <Stat label="Achievements" value={ACHIEVEMENTS.length} size="sm" icon="award" />
            <Stat label="Total XP" value={TOTAL_ACHIEVEMENT_XP.toLocaleString()} size="sm" icon="spark" />
            <Stat label="Earned" value={xpEarned.toLocaleString()} size="sm" icon="check-circle" />
            <Stat label="Remaining" value={(TOTAL_ACHIEVEMENT_XP - xpEarned).toLocaleString()} size="sm" icon="target" />
          </div>
          <div className="row-2" style={{ marginTop: 'var(--sp-3)' }}>
            {TIERS.map((t) => (
              <Chip key={t} tone="neutral">
                {t} {byTier.find((b) => b.tier === t)?.done ?? 0}/{byTier.find((b) => b.tier === t)?.total ?? 0}
              </Chip>
            ))}
          </div>
        </Card>
      </div>

      <p className="tiny faint center">
        {data.sessions.length} sessions · level {progress.level.level} {progress.level.title} · {progress.streak.longest} day longest streak ·{' '}
        {unlocked.length}/{ACHIEVEMENTS.length} achievements
      </p>
    </div>
  )
}

export default Achievements

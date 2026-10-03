import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, Meter, SectionHead, Segmented, Stat } from '../ui/primitives'
import { UnlockCard, UnlockHistory, type UnlockFilter } from '../gamification/Unlocks'
import { UNLOCKS, UNLOCK_KIND_LABEL } from '../../data/unlocks'
import { useAppState } from '../../lib/store'
import { evaluateAllUnlocks, unlockProgressPct, unlockRequirementText } from '../../lib/unlocks'
import { StatsAccumulator } from '../../lib/stats'
import { formatDate } from '../../lib/dates'

/**
 * What is unlocked, what is not, and exactly why.
 *
 * The history panel is the point: each row names the level, XP and condition that
 * earned the unlock, and when it happened.
 */

const KIND_FILTERS: { value: UnlockFilter; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'program', label: 'Programmes' },
  { value: 'exercise', label: 'Variations' },
  { value: 'theme', label: 'Themes' },
  { value: 'feature', label: 'Features' },
]

const KIND_ORDER = ['program', 'exercise', 'theme', 'feature'] as const

export function Unlocks() {
  const { data, progress } = useAppState()
  const [kind, setKind] = useState<UnlockFilter>('all')

  const stats = useMemo(() => {
    const acc = new StatsAccumulator(data.preferences.weekStartsOn, data.profile)
    for (const session of data.sessions) acc.addSession(session)
    acc.goalsCompleted = data.goals.filter((g) => g.completedAt).length
    return acc.toStats()
  }, [data])
  const achievementsUnlocked = progress.achievements.filter((a) => a.unlocked).length
  const evaluations = useMemo(() => evaluateAllUnlocks(stats, achievementsUnlocked), [stats, achievementsUnlocked])

  const rows = useMemo(
    () =>
      UNLOCKS.map((unlock) => ({
        unlock,
        evaluation: evaluations[unlock.id],
        event: progress.unlockEvents.find((e) => e.id === unlock.id),
        got: progress.unlockedIds.includes(unlock.id),
      })).sort((a, b) => {
        if (a.got !== b.got) return a.got ? -1 : 1
        const pa = a.evaluation ? unlockProgressPct(a.evaluation) : 0
        const pb = b.evaluation ? unlockProgressPct(b.evaluation) : 0
        return pb - pa
      }),
    [evaluations, progress.unlockEvents, progress.unlockedIds],
  )

  const shown = kind === 'all' ? rows : rows.filter((r) => r.unlock.kind === kind)
  const missing = rows.filter((r) => !r.got)
  const next = missing[0]

  return (
    <div className="page">
      <SectionHead
        icon="unlock"
        title="Unlocks"
        sub="Nothing essential is locked. Programmes, exercise variations, themes and two chart features are opened by training enough to earn them."
        actions={
          <Link to="/achievements" className="btn btn--quiet btn--sm">
            <Icon name="award" size={13} />
            Achievements
          </Link>
        }
      />

      <div className="grid-4">
        <Stat label="Unlocked" value={`${rows.filter((r) => r.got).length}/${UNLOCKS.length}`} icon="unlock" size="sm" />
        <Stat label="Level" value={progress.level.level} unit={progress.level.title} icon="spark" size="sm" />
        <Stat label="XP" value={progress.xp.toLocaleString()} icon="zap" size="sm" />
        <Stat label="Unlock events" value={progress.unlockEvents.length} icon="history" size="sm" hint="One row per thing you opened" />
      </div>

      {next ? (
        <Card title="Closest unlock" icon="target" sub={unlockRequirementText(next.unlock)}>
          <div className="stack-3">
            <div className="row-between">
              <span className="row-tight">
                <Icon name="lock" size={15} className="warn" />
                <strong>{next.unlock.name}</strong>
              </span>
              <span className="num faint">{Math.round((next.evaluation ? unlockProgressPct(next.evaluation) : 0) * 100)}%</span>
            </div>
            <Meter pct={(next.evaluation ? unlockProgressPct(next.evaluation) : 0) * 100} label={`Progress towards unlocking ${next.unlock.name}`} />
            <p className="tiny faint">{next.unlock.description}</p>
            {next.evaluation ? (
              <p className="tiny">
                {next.evaluation.progress.toLocaleString()} / {next.evaluation.target.toLocaleString()}
                {next.evaluation.metBy ? ` · condition met by ${next.evaluation.metBy}` : ''}
              </p>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card>
          <Empty icon="unlock" title="Everything is unlocked" text="Every programme, variation, theme and feature in the catalogue is available to you." />
        </Card>
      )}

      <Segmented ariaLabel="Filter unlocks by kind" options={KIND_FILTERS} value={kind} onChange={(v) => setKind(v as UnlockFilter)} />

      <div className="stack-4">
        {KIND_ORDER.filter((k) => kind === 'all' || kind === k).map((k) => {
          const group = shown.filter((r) => r.unlock.kind === k)
          if (group.length === 0) return null
          return (
            <section key={k} className="stack-3" aria-labelledby={`unlock-${k}`}>
              <SectionHead
                id={`unlock-${k}`}
                icon={k === 'theme' ? 'palette' : k === 'exercise' ? 'dumbbell' : k === 'feature' ? 'spark' : 'layers'}
                title={UNLOCK_KIND_LABEL[k]}
                sub={`${group.filter((g) => g.got).length} of ${group.length} unlocked`}
              />
              <div className="auto-grid" style={{ '--min': '300px' } as React.CSSProperties}>
                {group.map(({ unlock, evaluation, event }) => (
                  <UnlockCard key={unlock.id} unlock={unlock} event={event} progressPct={evaluation ? unlockProgressPct(evaluation) : 0} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* The panel the spec asks for: what, when, why, and what earned it. */}
      <UnlockHistory events={progress.unlockEvents} filter="all" />

      <Card title="How the unlock check works" icon="info">
        <ul className="stack-2">
          <li className="small row-tight">
            <Icon name="check" size={13} className="good" />
            Every unlock is tested against the same statistics the rest of the app uses — workouts, sets, volume, streaks, records, level and
            achievements you have already earned.
          </li>
          <li className="small row-tight">
            <Icon name="check" size={13} className="good" />
            When one is earned, the event records the level and XP you were at, so the history panel can explain it later.
          </li>
          <li className="small row-tight">
            <Icon name="check" size={13} className="good" />
            Unlocks are recalculated whenever your log changes. Removing the sessions that earned one takes it back — the history row stays, so
            you can see it happened.
          </li>
        </ul>
      </Card>

      {progress.unlockEvents.length > 0 ? (
        <Card title="Unlock timeline" icon="history" sub="Every unlock in the order you earned them">
          <ol className="stack-3">
            {[...progress.unlockEvents]
              .sort((a, b) => (a.unlockedAt || '').localeCompare(b.unlockedAt || ''))
              .map((event) => (
                <li key={event.id} className="row-between" style={{ gap: 'var(--sp-3)' }}>
                  <div className="stack-2" style={{ minWidth: 0 }}>
                    <span className="strong truncate">{event.name}</span>
                    <span className="tiny faint">{event.reason}</span>
                  </div>
                  <div className="col items-end" style={{ flex: 'none', textAlign: 'right' }}>
                    <span className="tiny num">{formatDate((event.unlockedAt || '').slice(0, 10), 'medium')}</span>
                    <span className="tiny faint">
                      level {event.levelAtUnlock} · {event.xpAtUnlock.toLocaleString()} XP
                    </span>
                  </div>
                </li>
              ))}
          </ol>
        </Card>
      ) : (
        <Card>
          <Empty icon="history" title="No unlocks yet" text="Your first one arrives quickly — the cheapest theme opens at level 3, 300 XP, which is roughly two sessions." />
        </Card>
      )}

      <div className="row-2">
        <Link to="/profile" className="btn btn--quiet btn--sm">
          <Icon name="palette" size={13} />
          Change theme
        </Link>
        <Link to="/programs" className="btn btn--quiet btn--sm">
          <Icon name="layers" size={13} />
          Programmes
        </Link>
        <Chip tone="neutral">{rows.filter((r) => !r.got).length} still locked</Chip>
      </div>
    </div>
  )
}

export default Unlocks

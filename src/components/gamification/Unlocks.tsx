import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../ui/Icon'
import { Card, Empty, Meter, Segmented } from '../ui/primitives'
import { UNLOCKS } from '../../data/unlocks'
import { UNLOCK_KIND_LABEL } from '../../data/unlocks'

/** Which unlock kinds the history panel can be narrowed to. */
export type UnlockFilter = 'all' | 'program' | 'exercise' | 'theme' | 'feature'
import { unlockRequirementText } from '../../lib/unlocks'
import { formatDate, relativeTime, toDateKey } from '../../lib/dates'
import type { UnlockDef, UnlockEvent } from '../../types'

/**
 * Unlocks and the unlock history panel.
 *
 * Requirement: every unlock must be explainable — what it was, when it
 * happened, why it happened, and how much XP the user had at that moment. The
 * replay engine records all four on the event, so this is a rendering job.
 */

const KIND_ICON: Record<string, IconName> = {
  program: 'layers',
  exercise: 'dumbbell',
  theme: 'palette',
  feature: 'spark',
  title: 'crown',
}

/** Where an unlocked thing can be used, so the panel is a doorway not a dead end. */
export function unlockHref(unlock: UnlockDef): string | undefined {
  switch (unlock.kind) {
    case 'program':
      return `/programs/${unlock.grants}`
    case 'exercise':
      return `/exercises/${unlock.grants}`
    case 'theme':
      return '/settings'
    case 'feature':
      return '/analytics'
    default:
      return undefined
  }
}

export function UnlockCard({
  unlock,
  event,
  progressPct = 0,
}: {
  unlock: UnlockDef
  event?: UnlockEvent
  progressPct?: number
}) {
  const unlocked = Boolean(event)
  const href = unlockHref(unlock)
  const body = (
    <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
      <span
        className="empty__icon"
        style={{
          width: 44,
          height: 44,
          borderRadius: 13,
          ...(unlocked
            ? { background: 'var(--grad-accent)', color: 'var(--accent-ink)', boxShadow: '0 0 24px -8px var(--accent-glow)' }
            : { background: 'var(--surface-2)', color: 'var(--text-faint)' }),
        }}
        aria-hidden
      >
        <Icon name={unlocked ? unlock.icon : 'lock'} size={20} />
      </span>

      <div className="stack-2 grow" style={{ minWidth: 0 }}>
        <div className="row-between" style={{ gap: 'var(--sp-2)' }}>
          <h3 className="strong truncate">{unlock.name}</h3>
          <span className="chip" style={{ flex: 'none' }}>
            <Icon name={KIND_ICON[unlock.kind] ?? 'spark'} size={11} />
            {UNLOCK_KIND_LABEL[unlock.kind] ?? unlock.kind}
          </span>
        </div>
        <p className="tiny muted clamp-2">{unlock.description}</p>

        {unlocked && event ? (
          <div className="stack-2">
            <p className="tiny accent">
              <Icon name="check-circle" size={11} style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 4 }} />
              {formatDate(toDateKey(event.unlockedAt), 'medium')} · {event.reason}
            </p>
            <p className="tiny faint num">
              Level {event.levelAtUnlock} · {event.xpAtUnlock.toLocaleString()} XP at the time
            </p>
          </div>
        ) : (
          <div className="stack-2">
            <Meter pct={progressPct} height="thin" glow={false} label={`${unlock.name} progress`} />
            <p className="tiny faint">{unlockRequirementText(unlock)}</p>
          </div>
        )}
      </div>
    </div>
  )

  if (href && unlocked) {
    return (
      <Link to={href} className="card card--pad card--interactive" style={{ display: 'block', color: 'inherit' }}>
        {body}
      </Link>
    )
  }
  return <Card>{body}</Card>
}

/* --------------------------------------------------------------------------
   Unlock history
   -------------------------------------------------------------------------- */

const FILTERS: { value: UnlockFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'program', label: 'Programmes' },
  { value: 'exercise', label: 'Variations' },
  { value: 'theme', label: 'Themes' },
  { value: 'feature', label: 'Features' },
]

export function UnlockHistory({ events, filter = 'all' }: { events: UnlockEvent[]; filter?: UnlockFilter }) {
  const [kind, setKind] = useState<UnlockFilter>(filter)

  const rows = useMemo(() => {
    const filtered = kind === 'all' ? events : events.filter((e) => e.kind === kind)
    return [...filtered].sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
  }, [events, kind])

  return (
    <Card
      title="Unlock history"
      icon="history"
      sub={`${events.length} unlock${events.length === 1 ? '' : 's'} earned, newest first — with the reason and the XP behind each one`}
      actions={
        <Segmented
          ariaLabel="Filter unlock history"
          size="sm"
          value={kind}
          onChange={setKind}
          options={FILTERS}
        />
      }
      pad={false}
    >
      {rows.length === 0 ? (
        <Empty
          icon="unlock"
          title={events.length === 0 ? 'Nothing unlocked yet' : 'Nothing in this category yet'}
          text={
            events.length === 0
              ? 'Unlocks come from real training: finish workouts, hold a streak, level up. Each one records what triggered it.'
              : 'Try a different filter, or keep training — the rest are listed below as locked.'
          }
        />
      ) : (
        <ol className="stack-2" style={{ padding: 'var(--sp-4)' }}>
          {rows.map((event) => {
            const unlock = UNLOCKS.find((u) => u.id === event.id)
            return (
              <li key={event.id} className="panel" style={{ padding: 'var(--sp-3)' }}>
                <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
                  <span className="empty__icon" style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--accent-soft)', color: 'var(--accent)' }} aria-hidden>
                    <Icon name={KIND_ICON[event.kind] ?? 'unlock'} size={16} />
                  </span>
                  <div className="stack-2 grow" style={{ minWidth: 0 }}>
                    <div className="row-between" style={{ gap: 'var(--sp-2)' }}>
                      <strong className="truncate">{event.name}</strong>
                      <span className="tiny faint num" style={{ flex: 'none' }} title={formatDate(toDateKey(event.unlockedAt), 'long')}>
                        {relativeTime(event.unlockedAt)}
                      </span>
                    </div>
                    <p className="tiny muted">{event.reason}</p>
                    <div className="row-2 tiny faint">
                      <span className="chip">
                        <Icon name={KIND_ICON[event.kind] ?? 'spark'} size={11} />
                        {UNLOCK_KIND_LABEL[event.kind] ?? event.kind}
                      </span>
                      <span className="num">Level {event.levelAtUnlock}</span>
                      <span className="num">{event.xpAtUnlock.toLocaleString()} XP</span>
                      {unlock ? <span className="truncate">Grants: {unlock.grants}</span> : null}
                      {unlock && unlockHref(unlock) ? <Link to={unlockHref(unlock)!}>Open →</Link> : null}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}

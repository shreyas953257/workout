import { useMemo, useState } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import { Card, Empty, Segmented } from '../ui/primitives'
import { XP_KIND_LABEL } from '../../data/xp'
import { formatDate, relativeTime } from '../../lib/dates'
import type { XpEvent, XpKind } from '../../types'

/**
 * The XP ledger.
 *
 * A line for everything the replay engine awarded, newest first, with the source
 * and the running total. This is the audit trail behind the level number — if a
 * total looks wrong, the user can read exactly where it came from.
 */

const KIND_ICON: Record<XpKind, IconName> = {
  set: 'layers',
  workout: 'check-circle',
  volume: 'weight',
  pr: 'star',
  streak: 'flame',
  achievement: 'trophy',
  goal: 'target',
  'goal-milestone': 'flag',
}

const KIND_TONE: Record<XpKind, string> = {
  set: 'var(--chart-1)',
  workout: 'var(--chart-2)',
  volume: 'var(--chart-3)',
  pr: 'var(--good)',
  streak: 'var(--warn)',
  achievement: 'var(--accent)',
  goal: 'var(--info)',
  'goal-milestone': 'var(--info)',
}

type LedgerFilter = XpKind | 'all'

const FILTERS: { value: LedgerFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'set', label: 'Sets' },
  { value: 'workout', label: 'Sessions' },
  { value: 'pr', label: 'Records' },
  { value: 'achievement', label: 'Awards' },
  { value: 'streak', label: 'Streaks' },
  { value: 'goal', label: 'Goals' },
]

export function XpLedger({ events, limit = 40 }: { events: XpEvent[]; limit?: number }) {
  const [filter, setFilter] = useState<LedgerFilter>('all')

  const rows = useMemo(() => {
    const filtered = filter === 'all' ? events : events.filter((e) => e.kind === filter || (filter === 'goal' && e.kind === 'goal-milestone'))
    return [...filtered].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
  }, [events, filter, limit])

  const grouped = useMemo(() => {
    const byDate = new Map<string, XpEvent[]>()
    for (const event of rows) {
      const list = byDate.get(event.date)
      if (list) list.push(event)
      else byDate.set(event.date, [event])
    }
    return [...byDate.entries()]
  }, [rows])

  return (
    <Card
      title="XP ledger"
      icon="spark"
      sub={`${events.length} awards · ${events.reduce((n, e) => n + e.amount, 0).toLocaleString()} XP in total`}
      actions={<Segmented ariaLabel="Filter XP events" size="sm" value={filter} onChange={setFilter} options={FILTERS} />}
      pad={false}
    >
      {rows.length === 0 ? (
        <Empty icon="spark" title="No XP yet" text="Finish a workout and every set you complete is written here with the XP it earned." />
      ) : (
        <div className="stack-4" style={{ padding: 'var(--sp-4)' }}>
          {grouped.map(([date, dayEvents]) => (
            <div key={date} className="stack-2">
              <p className="eyebrow row-between">
                <span>{formatDate(date, 'medium')}</span>
                <span className="num accent">+{dayEvents.reduce((n, e) => n + e.amount, 0).toLocaleString()} XP</span>
              </p>
              <ul className="stack-2">
                {dayEvents.map((event, i) => (
                  <li key={`${event.at}-${i}`} className="row-tight" style={{ gap: 'var(--sp-3)' }}>
                    <span
                      aria-hidden
                      style={{
                        width: 26,
                        height: 26,
                        flex: 'none',
                        borderRadius: 8,
                        display: 'grid',
                        placeItems: 'center',
                        background: 'var(--surface-2)',
                        color: KIND_TONE[event.kind] ?? 'var(--accent)',
                      }}
                    >
                      <Icon name={KIND_ICON[event.kind] ?? 'spark'} size={14} />
                    </span>
                    <span className="grow truncate small" title={`${XP_KIND_LABEL[event.kind]} · ${relativeTime(event.at)}`}>
                      {event.label}
                    </span>
                    <span className="num tiny faint">{XP_KIND_LABEL[event.kind]}</span>
                    <span className="num small strong" style={{ minWidth: 56, textAlign: 'right' }}>
                      +{event.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/** Compact version for the dashboard sidebar. */
export function XpRecent({ events, limit = 6 }: { events: XpEvent[]; limit?: number }) {
  const rows = [...events].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
  if (rows.length === 0) return null
  return (
    <ul className="stack-2">
      {rows.map((event, i) => (
        <li key={`${event.at}-${i}`} className="row-tight tiny" style={{ gap: 'var(--sp-2)' }}>
          <Icon name={KIND_ICON[event.kind] ?? 'spark'} size={13} style={{ color: KIND_TONE[event.kind], flex: 'none' }} />
          <span className="grow truncate muted">{event.label}</span>
          <span className="num strong" style={{ flex: 'none' }}>
            +{event.amount}
          </span>
        </li>
      ))}
    </ul>
  )
}

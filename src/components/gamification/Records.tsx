import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Empty, Stat } from '../ui/primitives'
import { formatDate } from '../../lib/dates'
import { formatWeight } from '../../lib/format'
import type { PersonalRecord } from '../../types'
import type { PrScanResult } from '../../lib/prs'

/**
 * Personal records.
 *
 * Records are scanned out of the logged sets, never asserted by the user, so a
 * record here means "the heaviest / most reps / best estimated 1RM you have
 * actually written down".
 */

const KIND_LABEL: Record<string, string> = {
  weight: 'Heaviest',
  reps: 'Most reps',
  e1rm: 'Best est. 1RM',
  volume: 'Best set volume',
}

const KIND_ICON = {
  weight: 'weight',
  reps: 'repeat',
  e1rm: 'gauge',
  volume: 'layers',
} as const

export function RecordCard({ record, units = 'kg' }: { record: PersonalRecord; units?: 'kg' | 'lb' }) {
  const isReps = record.unit === 'reps'
  const rows: { label: string; value: string; date?: string; icon: keyof typeof KIND_ICON }[] = isReps
    ? [
        {
          label: 'Heaviest',
          value: record.bestWeight > 0 ? `${formatWeight(record.bestWeight, units)} × ${record.bestWeightReps}` : '—',
          date: record.bestWeightDate,
          icon: 'weight',
        },
        {
          label: 'Most reps',
          value: record.bestReps > 0 ? `${record.bestReps} @ ${formatWeight(record.bestRepsWeight, units)}` : '—',
          date: record.bestRepsDate,
          icon: 'reps',
        },
        {
          label: 'Best est. 1RM',
          value: record.bestE1rm > 0 ? formatWeight(record.bestE1rm, units) : '—',
          date: record.bestE1rmDate,
          icon: 'e1rm',
        },
        {
          label: 'Best set volume',
          value: record.bestVolume > 0 ? `${formatWeight(record.bestVolume, units)}` : '—',
          date: record.bestVolumeDate,
          icon: 'volume',
        },
      ]
    : [
        {
          label: record.unit === 'seconds' ? 'Longest hold' : 'Farthest',
          value:
            record.bestReps > 0
              ? `${record.bestReps.toLocaleString()} ${record.unit === 'seconds' ? 's' : 'm'}`
              : '—',
          date: record.bestRepsDate,
          icon: 'reps',
        },
        { label: 'Sets logged', value: String(record.totalSets), icon: 'volume' },
      ]

  return (
    <Card
      title={record.exerciseName}
      icon="star"
      sub={`${record.totalSets} sets logged${isReps ? '' : ` · ${record.unit}`}`}
      actions={
        <Link to={`/exercises/${record.exerciseId}`} className="btn btn--ghost btn--sm">
          Details
          <Icon name="arrow-right" size={13} />
        </Link>
      }
    >
      <div className="auto-grid" style={{ '--min': '128px' } as React.CSSProperties}>
        {rows.map((row) => (
          <Stat
            key={row.label}
            label={row.label}
            value={row.value}
            icon={row.icon}
            size="sm"
            hint={row.date ? `Set ${formatDate(row.date, 'long')}` : undefined}
          />
        ))}
      </div>
    </Card>
  )
}

export function RecentRecords({
  events,
  limit = 8,
  emptyAction,
}: {
  events: PrScanResult['events']
  limit?: number
  emptyAction?: React.ReactNode
}) {
  const rows = events.slice(0, limit)
  if (rows.length === 0) {
    return (
      <Card title="Recent records" icon="star" sub="Every record here came from a set you logged">
        <Empty
          icon="star"
          title="No records beaten yet"
          text="The first time you log an exercise it becomes your baseline. Beat that baseline and it lands here."
          action={emptyAction}
        />
      </Card>
    )
  }
  return (
    <Card title="Recent records" icon="star" sub={`${events.length} improvements on a previous best`} pad={false}>
      <ul className="stack-2" style={{ padding: 'var(--sp-4)' }}>
        {rows.map((event, i) => (
          <li key={`${event.sessionId}-${event.exerciseId}-${event.kind}-${i}`} className="row" style={{ gap: 'var(--sp-3)' }}>
            <span className="empty__icon" style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }} aria-hidden>
              <Icon name={KIND_ICON[event.kind]} size={15} />
            </span>
            <div className="grow" style={{ minWidth: 0 }}>
              <p className="small strong truncate">
                {event.exerciseName} · {KIND_LABEL[event.kind] ?? event.kind}
              </p>
              <p className="tiny faint">
                {event.detail} · {formatDate(event.date, 'short')}
              </p>
            </div>
            <Link to={`/exercises/${event.exerciseId}`} className="iconbtn" aria-label={`Open ${event.exerciseName}`}>
              <Icon name="chevron-right" size={15} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

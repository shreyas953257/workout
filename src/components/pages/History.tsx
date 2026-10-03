import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, SectionHead, Stat, Segmented } from '../ui/primitives'
import { SessionCard, SessionEmpty } from '../workout/SessionBits'
import { ProgressHeadline, WeekDots } from '../gamification'
import { useAppState } from '../../lib/store'
import { startFreeSession } from '../../lib/start'
import { formatDate, monthKey, relativeDay, todayKey } from '../../lib/dates'
import { formatDuration, pluralize } from '../../lib/format'
import { frequencyStats } from '../../lib/analytics'

type Range = '30' | '90' | '365' | 'all'

const RANGES: { value: Range; label: string }[] = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: 'Year' },
  { value: 'all', label: 'All time' },
]

/** Every logged session, newest first, grouped by month, with a text search. */

export function History() {
  const { data, progress } = useAppState()
  const navigate = useNavigate()
  const [range, setRange] = useState<Range>('all')
  const [query, setQuery] = useState('')
  const [programme, setProgramme] = useState<string>('all')

  const programmes = useMemo(() => {
    const ids = new Set(data.sessions.map((s) => s.programId).filter(Boolean) as string[])
    return [...ids]
  }, [data.sessions])

  const filtered = useMemo(() => {
    const today = todayKey()
    const cutoff =
      range === 'all'
        ? ''
        : range === '365'
          ? new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10)
          : new Date(Date.now() - (Number(range) - 1) * 86400000).toISOString().slice(0, 10)

    const q = query.trim().toLowerCase()
    const cutoffKey = range === 'all' ? '' : cutoff.replace(/^(\d{4}-\d{2}-\d{2}).*$/, '$1')

    return [...data.sessions]
      .filter((s) => (range === 'all' ? true : (s.date || '') >= cutoffKey))
      .filter((s) => (programme === 'all' ? true : s.programId === programme))
      .filter((s) => {
        if (!q) return true
        const haystack = [
          s.title,
          s.notes ?? '',
          s.programId ?? '',
          s.dayId ?? '',
          ...s.exercises.map((l) => l.name),
          ...s.exercises.map((l) => l.note ?? ''),
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.completedAt || '').localeCompare(a.completedAt || ''))
    void today
  }, [data.sessions, range, query, programme])

  const months = useMemo(() => {
    const groups = new Map<string, typeof filtered>()
    for (const s of filtered) {
      const key = monthKey(s.date || todayKey())
      const list = groups.get(key) ?? []
      list.push(s)
      groups.set(key, list)
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, s) => ({
          sets: acc.sets + (s.completedSets || 0),
          volume: acc.volume + (s.volumeKg || 0),
          minutes: acc.minutes + (s.durationMin || 0),
          xp: acc.xp + (s.xp || 0),
        }),
        { sets: 0, volume: 0, minutes: 0, xp: 0 },
      ),
    [filtered],
  )

  const freq = useMemo(() => frequencyStats(data.sessions, data.preferences.weekStartsOn), [data.sessions, data.preferences.weekStartsOn])

  return (
    <div className="page">
      <SectionHead
        icon="history"
        title="Workout history"
        sub={
          data.sessions.length === 0
            ? 'Nothing logged yet'
            : `${data.sessions.length} ${pluralize(data.sessions.length, 'session')} · ${progress.totals.sets.toLocaleString()} sets · ${Math.round(progress.totals.volumeKg).toLocaleString()} ${data.profile.units} lifted`
        }
        actions={
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              startFreeSession()
              navigate('/session')
            }}
          >
            <Icon name="plus" size={13} />
            Log a session
          </button>
        }
      />

      <div className="grid-2">
        <Card title="Consistency" icon="chart">
          <div className="stack-4">
            <ProgressHeadline progress={progress} />
            <WeekDots weekly={progress.weekly} weekStartsOn={data.preferences.weekStartsOn} />
            <p className="tiny faint">
              {freq.total} sessions across {freq.activeWeeks} {pluralize(freq.activeWeeks, 'week')} · {freq.perActiveWeek.toFixed(1)} per active week ·
              best week {freq.bestWeek ? `${formatDate(freq.bestWeek.weekStart, 'short')} (${freq.bestWeek.count})` : '—'}
            </p>
          </div>
        </Card>
        <Card title="Lifetime totals" icon="database">
          <div className="grid-2">
            <Stat label="Volume" value={Math.round(progress.totals.volumeKg).toLocaleString()} unit={data.profile.units} size="sm" icon="layers" />
            <Stat label="Sets" value={progress.totals.sets.toLocaleString()} size="sm" icon="repeat" />
            <Stat label="Time" value={formatDuration(progress.totals.durationMin)} size="sm" icon="clock" />
            <Stat label="Records" value={progress.prCount} size="sm" icon="trophy" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="stack-3">
          <div className="row-between" style={{ gap: 'var(--sp-3)' }}>
            <div className="searchbar grow">
              <Icon name="search" size={16} />
              <input
                className="input"
                type="search"
                value={query}
                placeholder="Search titles, exercises and notes…"
                aria-label="Search workout history"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Segmented ariaLabel="Date range" options={RANGES} value={range} onChange={(v) => setRange(v as Range)} />
          </div>
          {programmes.length > 1 ? (
            <div className="row-2">
              <button type="button" className={`chip ${programme === 'all' ? 'is-on' : ''}`} aria-pressed={programme === 'all'} onClick={() => setProgramme('all')}>
                Every programme
              </button>
              {programmes.map((id) => (
                <button key={id} type="button" className={`chip ${programme === id ? 'is-on' : ''}`} aria-pressed={programme === id} onClick={() => setProgramme(id)}>
                  {data.sessions.find((s) => s.programId === id)?.title.split('·')[0].trim() ?? id}
                </button>
              ))}
            </div>
          ) : null}
          <p className="tiny faint">
            Showing {filtered.length} of {data.sessions.length} sessions · {totals.sets} sets · {Math.round(totals.volume).toLocaleString()}{' '}
            {data.profile.units} · {formatDuration(totals.minutes)} · {totals.xp.toLocaleString()} XP
          </p>
        </div>
      </Card>

      {data.sessions.length === 0 ? (
        <SessionEmpty onCreate={() => { startFreeSession(); navigate('/session') }} />
      ) : filtered.length === 0 ? (
        <Card>
          <Empty
            icon="search"
            title="No sessions match"
            text="Try a different range, clear the programme filter, or search for one of the exercises you logged."
            action={
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setQuery('')
                  setProgramme('all')
                  setRange('all')
                }}
              >
                Reset filters
              </button>
            }
          />
        </Card>
      ) : (
        <div className="stack-5">
          {months.map(([month, list]) => (
            <section key={month} className="stack-3" aria-label={month}>
              <div className="row-between">
                <h2 className="eyebrow">
                  {formatDate(`${month}-01`, 'medium').replace(/^\d+ /, '')} · {list.length} {pluralize(list.length, 'session')}
                </h2>
                <Chip tone="neutral">
                  {list.reduce((n, s) => n + s.completedSets, 0)} sets · {Math.round(list.reduce((n, s) => n + s.volumeKg, 0)).toLocaleString()}{' '}
                  {data.profile.units}
                </Chip>
              </div>
              <div className="stack-3">
                {list.map((s, i) => (
                  <SessionCard key={s.id} session={s} index={i} units={data.profile.units} />
                ))}
              </div>
            </section>
          ))}
          <p className="tiny faint center">
            Oldest session here: {formatDate(filtered[filtered.length - 1]?.date ?? todayKey(), 'long')} (
            {relativeDay(filtered[filtered.length - 1]?.date ?? todayKey())})
          </p>
        </div>
      )}
    </div>
  )
}

export default History

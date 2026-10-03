import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, SectionHead, Stat } from '../ui/primitives'
import { Heatmap } from '../charts'
import { SessionCard } from '../workout/SessionBits'
import { useAppState } from '../../lib/store'
import { heatmapData, intensityBucket } from '../../lib/analytics'
import { addDays, calendarGrid, daysInMonth, formatDate, formatMonthLabel, todayKey, toDateKey, weekdayIndex } from '../../lib/dates'
import { formatDuration, pluralize } from '../../lib/format'

/** Month grid plus a year-long heatmap. Every cell is a day you did or did not train. */

const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DOW_SHORT_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarPage() {
  const { data, progress } = useAppState()
  const today = todayKey()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [selected, setSelected] = useState<string>(today)

  const cells = useMemo(() => calendarGrid(cursor.year, cursor.month, data.preferences.weekStartsOn, today), [cursor, data.preferences.weekStartsOn, today])

  const byDay = useMemo(() => {
    const map = new Map<string, { sets: number; volume: number; xp: number; minutes: number; sessions: number }>()
    for (const s of data.sessions) {
      const key = s.date || toDateKey(s.completedAt)
      if (!key) continue
      const entry = map.get(key) ?? { sets: 0, volume: 0, xp: 0, minutes: 0, sessions: 0 }
      entry.sets += s.completedSets || 0
      entry.volume += s.volumeKg || 0
      entry.xp += s.xp || 0
      entry.minutes += s.durationMin || 0
      entry.sessions += 1
      map.set(key, entry)
    }
    return map
  }, [data.sessions])

  const heatCells = useMemo(() => {
    const raw = heatmapData(data.sessions, progress.xpByDay)
    return Object.values(raw).map((day) => ({
      date: day.date,
      level: intensityBucket(day),
      title: `${formatDate(day.date, 'medium')} · ${day.workouts} ${pluralize(day.workouts, 'workout')} · ${day.sets} sets · ${formatDuration(day.durationMin)} · ${day.xp} XP`,
    }))
  }, [data.sessions, progress.xpByDay])

  const monthSessions = useMemo(() => {
    const prefix = `${cursor.year}-${String(cursor.month).padStart(2, '0')}`
    return data.sessions.filter((s) => (s.date || '').startsWith(prefix))
  }, [data.sessions, cursor])

  const monthStats = useMemo(() => {
    const days = new Set(monthSessions.map((s) => s.date))
    return {
      sessions: monthSessions.length,
      trainingDays: days.size,
      sets: monthSessions.reduce((n, s) => n + (s.completedSets || 0), 0),
      volume: monthSessions.reduce((n, s) => n + (s.volumeKg || 0), 0),
      minutes: monthSessions.reduce((n, s) => n + (s.durationMin || 0), 0),
      xp: monthSessions.reduce((n, s) => n + (s.xp || 0), 0),
    }
  }, [monthSessions])

  const selectedSessions = useMemo(
    () => data.sessions.filter((s) => (s.date || toDateKey(s.completedAt)) === selected).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || '')),
    [data.sessions, selected],
  )

  const move = (delta: number) => {
    setCursor(({ year, month }) => {
      const next = month + delta
      if (next < 1) return { year: year - 1, month: 12 }
      if (next > 12) return { year: year + 1, month: 1 }
      return { year, month: next }
    })
  }

  const dowLabels = data.preferences.weekStartsOn === 0 ? DOW_SHORT_SUN : DOW_SHORT
  const monthDays = daysInMonth(cursor.year, cursor.month)
  const busiest = useMemo(() => {
    const counts = new Map<number, number>()
    for (const s of data.sessions) {
      const idx = weekdayIndex(s.date || toDateKey(s.completedAt))
      counts.set(idx, (counts.get(idx) ?? 0) + 1)
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    return top ? { day: DOW_SHORT_SUN[top[0]], count: top[1] } : null
  }, [data.sessions])

  return (
    <div className="page">
      <SectionHead
        icon="calendar"
        title="Training calendar"
        sub={`${progress.streak.current} day streak · ${progress.streak.longest} longest · ${progress.totals.workouts} sessions in total`}
        actions={
          <Link to="/history" className="btn btn--quiet btn--sm">
            <Icon name="history" size={13} />
            History list
          </Link>
        }
      />

      <div className="grid-4">
        <Stat label="This month" value={monthStats.sessions} unit={pluralize(monthStats.sessions, 'session')} icon="dumbbell" size="sm" />
        <Stat label="Training days" value={monthStats.trainingDays} unit={`of ${monthDays}`} icon="calendar-check" size="sm" />
        <Stat label="Volume" value={Math.round(monthStats.volume).toLocaleString()} unit={data.profile.units} icon="layers" size="sm" />
        <Stat label="XP" value={monthStats.xp.toLocaleString()} icon="spark" size="sm" />
      </div>

      <Card
        title={formatMonthLabel(cursor.year, cursor.month)}
        icon="calendar"
        sub={`${monthStats.sets} sets · ${formatDuration(monthStats.minutes)} trained this month`}
        actions={
          <div className="row" style={{ gap: 'var(--sp-1)' }}>
            <button type="button" className="iconbtn" aria-label="Previous month" onClick={() => move(-1)}>
              <Icon name="chevron-left" size={16} />
            </button>
            <button
              type="button"
              className="iconbtn"
              aria-label="Jump to this month"
              onClick={() => {
                const now = new Date()
                setCursor({ year: now.getFullYear(), month: now.getMonth() + 1 })
                setSelected(today)
              }}
            >
              <Icon name="target" size={15} />
            </button>
            <button type="button" className="iconbtn" aria-label="Next month" onClick={() => move(1)}>
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
        }
      >
        <div className="cal" role="grid" aria-label={`Training calendar for ${formatMonthLabel(cursor.year, cursor.month)}`}>
          {dowLabels.map((d) => (
            <div key={d} className="cal__dow" role="columnheader">
              {d.slice(0, 1)}
              <span className="sr-only">{d}</span>
            </div>
          ))}
          {cells.flat().map((cell) => {
            const entry = byDay.get(cell.key)
            const level = !entry ? 0 : entry.sets >= 20 ? 4 : entry.sets >= 12 ? 3 : entry.sets >= 6 ? 2 : 1
            return (
              <button
                key={cell.key}
                type="button"
                className={`cal__cell ${cell.inMonth ? '' : 'is-out'} ${cell.isToday ? 'is-today' : ''} ${selected === cell.key ? 'is-sel' : ''}`}
                data-level={level}
                role="gridcell"
                aria-label={`${formatDate(cell.key, 'long')}${entry ? ` — ${entry.sessions} session, ${entry.sets} sets` : ' — no training'}`}
                aria-pressed={selected === cell.key}
                onClick={() => setSelected(cell.key)}
              >
                <span className="cal__num num">{cell.day}</span>
                {entry ? (
                  <span className="cal__dot" aria-hidden="true">
                    {entry.sessions > 2 ? entry.sessions : ''}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        <div className="row-between" style={{ marginTop: 'var(--sp-3)' }}>
          <p className="tiny faint">Tap any day to see what was logged. Shading follows completed sets.</p>
          <div className="legend row-tight" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((l) => (
              <span key={l} className="legend__swatch" data-level={l} />
            ))}
          </div>
        </div>
      </Card>

      <section className="stack-3" aria-labelledby="day-detail">
        <SectionHead
          id="day-detail"
          icon="list-checks"
          title={formatDate(selected, 'long')}
          sub={
            selectedSessions.length > 0
              ? `${selectedSessions.length} ${pluralize(selectedSessions.length, 'session')} · ${selectedSessions.reduce((n, s) => n + s.completedSets, 0)} sets · ${formatDuration(selectedSessions.reduce((n, s) => n + s.durationMin, 0))}`
              : 'Nothing logged on this day'
          }
        />
        {selectedSessions.length === 0 ? (
          <Card>
            <Empty
              icon="moon"
              title="A rest day"
              text="No session was logged here. Rest days are part of the plan — they are not gaps in your record."
            />
          </Card>
        ) : (
          <div className="stack-3">
            {selectedSessions.map((s) => (
              <SessionCard key={s.id} session={s} units={data.profile.units} />
            ))}
          </div>
        )}
      </section>

      <Card title="Year in training" icon="chart" sub="One square per day. Hover or focus a square for that day's numbers.">
        <Heatmap cells={heatCells} weeks={52} weekStartsOn={data.preferences.weekStartsOn} endDate={today} ariaLabel="Training heatmap for the last year" />
      </Card>

      <div className="grid-2">
        <Card title="When you train" icon="clock">
          {busiest ? (
            <div className="stack-3">
              <p className="small">
                Most of your sessions land on <strong>{busiest.day}</strong> — {busiest.count} of {data.sessions.length}.
              </p>
              <ul className="stack-2">
                {progress.weekly.slice(-6).reverse().map((w) => (
                  <li key={w.weekStart} className="row-between tiny">
                    <span>{w.label}</span>
                    <span className="faint num">
                      {w.workouts} sessions · {w.sets} sets · {formatDuration(w.durationMin)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Empty icon="clock" title="No pattern yet" text="Log a few sessions and this shows which weekday you train most." />
          )}
        </Card>
        <Card title="Nearby days" icon="arrow-right">
          <ul className="stack-2">
            {[today, ...Array.from({ length: 6 }, (_, i) => addDays(today, i + 1))].map((key) => {
              const entry = byDay.get(key)
              return (
                <li key={key} className="row-between tiny" style={{ gap: 'var(--sp-3)' }}>
                  <span>
                    {formatDate(key, 'medium')}
                    {key === today ? <Chip tone="accent">today</Chip> : null}
                  </span>
                  <span className="faint">{entry ? `${entry.sessions} session · ${entry.xp} XP` : '—'}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default CalendarPage

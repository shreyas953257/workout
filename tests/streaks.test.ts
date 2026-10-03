import { describe, expect, it } from 'vitest'
import { computeStreak, milestonesReached, nextStreakMilestone, perfectWeekCount, perfectWeeks, uniqueSortedDates, weeklyAttendance } from '../src/lib/streaks'
import { computeFinalStreak } from '../src/lib/progress'
import { addDays, startOfWeek } from '../src/lib/dates'
import { TODAY, consecutiveSessions, daysBefore, makeSession } from './fixtures'

const datesFrom = (sessions: { date: string }[]) => sessions.map((s) => s.date)

describe('uniqueSortedDates', () => {
  it('de-duplicates and sorts', () => {
    expect(uniqueSortedDates(['2026-10-03', '2026-10-01', '2026-10-03'])).toEqual(['2026-10-01', '2026-10-03'])
  })

  it('drops malformed entries rather than corrupting the run', () => {
    expect(uniqueSortedDates(['2026-10-01', 'not-a-date', '', '2026-13-45'])).toEqual(['2026-10-01'])
  })
})

describe('computeStreak', () => {
  it('is zero with no training history', () => {
    const s = computeStreak([], TODAY)
    expect(s.current).toBe(0)
    expect(s.longest).toBe(0)
    expect(s.totalDays).toBe(0)
    expect(s.lastWorkoutDate).toBeUndefined()
  })

  it('counts consecutive days ending today', () => {
    const sessions = consecutiveSessions(TODAY, 5)
    const s = computeStreak(datesFrom(sessions), TODAY)
    expect(s.current).toBe(5)
    expect(s.longest).toBe(5)
    expect(s.currentIncludingToday).toBe(true)
    expect(s.totalDays).toBe(5)
  })

  it('breaks on a gap', () => {
    const dates = [daysBefore(6), daysBefore(5), daysBefore(4), daysBefore(2), daysBefore(1), TODAY]
    const s = computeStreak(dates, TODAY)
    expect(s.current).toBe(3) // 2 days ago, yesterday, today
    expect(s.longest).toBe(3)
  })

  it('keeps the streak alive when today has not been trained yet', () => {
    const dates = [daysBefore(3), daysBefore(2), daysBefore(1)]
    const s = computeStreak(dates, TODAY)
    expect(s.current).toBe(3)
    expect(s.currentIncludingToday).toBe(false)
  })

  it('reports zero once a day has been missed entirely', () => {
    const dates = [daysBefore(4), daysBefore(3)]
    const s = computeStreak(dates, TODAY)
    expect(s.current).toBe(0)
    expect(s.longest).toBe(2)
    expect(s.currentIncludingToday).toBe(false)
  })

  it('does not double-count two sessions on the same day', () => {
    const dates = [daysBefore(1), TODAY, TODAY]
    const s = computeStreak(dates, TODAY)
    expect(s.current).toBe(2)
    expect(s.totalDays).toBe(2)
  })

  it('tracks the longest run separately from the current one', () => {
    const long = Array.from({ length: 9 }, (_, i) => daysBefore(30 - i))
    const recent = [daysBefore(2), daysBefore(1), TODAY]
    const s = computeStreak([...long, ...recent], TODAY)
    expect(s.current).toBe(3)
    expect(s.longest).toBe(9)
  })

  it('handles a single training day', () => {
    const s = computeStreak([TODAY], TODAY)
    expect(s.current).toBe(1)
    expect(s.longest).toBe(1)
  })

  it('is not fooled by out-of-order input', () => {
    const dates = [TODAY, daysBefore(2), daysBefore(1)]
    expect(computeStreak(dates, TODAY).current).toBe(3)
  })
})

describe('computeFinalStreak (the value the UI shows)', () => {
  it('measures against today, not against the last session', () => {
    // Trained five days straight, but three weeks ago — the streak is over.
    const old = Array.from({ length: 5 }, (_, i) => makeSession({ date: daysBefore(25 - i) }))
    const s = computeFinalStreak(old, TODAY)
    expect(s.current).toBe(0)
    expect(s.longest).toBe(5)
    expect(s.lastWorkoutDate).toBe(daysBefore(21))
  })

  it('reads the date from completedAt when the date field is missing', () => {
    const base = makeSession({ date: TODAY })
    const session = { ...base, date: '', completedAt: new Date(`${TODAY}T18:00:00`).toISOString() }
    expect(computeFinalStreak([session], TODAY).current).toBe(1)
  })

  it('crosses a month boundary correctly', () => {
    const dates = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']
    expect(computeStreak(dates, '2026-10-03').current).toBe(5)
  })

  it('crosses a year boundary correctly', () => {
    const dates = ['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']
    expect(computeStreak(dates, '2026-01-02').current).toBe(4)
  })
})

describe('streak milestones', () => {
  it('reports every milestone reached', () => {
    expect(milestonesReached(0)).toEqual([])
    expect(milestonesReached(3)).toEqual([3])
    expect(milestonesReached(7)).toEqual([3, 7])
    expect(milestonesReached(31)).toEqual([3, 7, 14, 21, 30])
  })

  it('points at the next milestone and its bonus', () => {
    expect(nextStreakMilestone(0)).toEqual({ days: 3, bonus: 15 })
    expect(nextStreakMilestone(3)).toEqual({ days: 4, bonus: 40 })
    expect(nextStreakMilestone(7)).toEqual({ days: 7, bonus: 60 })
  })

  it('returns null once every milestone is behind the user', () => {
    expect(nextStreakMilestone(400)).toBeNull()
  })
})

describe('perfectWeeks', () => {
  const daysPerWeek = (id: string) => (id === 'beginner-full-body' ? 3 : id === 'intermediate-upper-lower' ? 4 : 0)

  it('counts a week where every scheduled session happened', () => {
    const monday = startOfWeek(TODAY, 1) // 2026-09-28
    const sessions = [
      { date: monday, programId: 'beginner-full-body' },
      { date: addDays(monday, 2), programId: 'beginner-full-body' },
      { date: addDays(monday, 4), programId: 'beginner-full-body' },
    ]
    expect(perfectWeekCount(sessions, daysPerWeek)).toBe(1)
  })

  it('does not count a week with a missed session', () => {
    const monday = startOfWeek(TODAY, 1)
    const sessions = [
      { date: monday, programId: 'beginner-full-body' },
      { date: addDays(monday, 2), programId: 'beginner-full-body' },
    ]
    expect(perfectWeekCount(sessions, daysPerWeek)).toBe(0)
    const weeks = perfectWeeks(sessions, daysPerWeek)
    expect(weeks[0].scheduled).toBe(3)
    expect(weeks[0].completed).toBe(2)
  })

  it('ignores weeks with no programme attached', () => {
    // An ad-hoc session is not a broken week — it is just not programme work.
    const sessions = [{ date: startOfWeek(TODAY, 1) }]
    expect(perfectWeeks(sessions, daysPerWeek)).toHaveLength(0)
    expect(perfectWeekCount(sessions, daysPerWeek)).toBe(0)
  })

  it('ignores an unknown programme id', () => {
    const sessions = [{ date: startOfWeek(TODAY, 1), programId: 'not-a-programme' }]
    expect(perfectWeeks(sessions, daysPerWeek)).toHaveLength(0)
  })

  it('counts multiple sessions on one day once', () => {
    const monday = startOfWeek(TODAY, 1)
    const sessions = [
      { date: monday, programId: 'beginner-full-body' },
      { date: monday, programId: 'beginner-full-body' },
      { date: addDays(monday, 2), programId: 'beginner-full-body' },
      { date: addDays(monday, 4), programId: 'beginner-full-body' },
    ]
    expect(perfectWeekCount(sessions, daysPerWeek)).toBe(1)
  })

  it('handles a Sunday-start week', () => {
    const sunday = startOfWeek(TODAY, 0) // 2026-09-27 is a Sunday
    const sessions = [
      { date: sunday, programId: 'beginner-full-body' },
      { date: addDays(sunday, 2), programId: 'beginner-full-body' },
      { date: addDays(sunday, 4), programId: 'beginner-full-body' },
    ]
    expect(perfectWeekCount(sessions, daysPerWeek, 0)).toBe(1)
  })
})

describe('weeklyAttendance', () => {
  it('reports a rate capped at 1 even when the user over-trains', () => {
    const monday = startOfWeek(TODAY, 1)
    const sessions = Array.from({ length: 5 }, (_, i) => ({
      date: addDays(monday, i),
      programId: 'beginner-full-body',
    }))
    const rows = weeklyAttendance(sessions, () => 3)
    expect(rows).toHaveLength(1)
    expect(rows[0].completed).toBe(5)
    expect(rows[0].rate).toBe(1)
  })

  it('reports partial attendance as a fraction', () => {
    const monday = startOfWeek(TODAY, 1)
    const rows = weeklyAttendance([{ date: monday, programId: 'p' }], () => 4)
    expect(rows[0].rate).toBe(0.25)
  })
})

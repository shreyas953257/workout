import { describe, expect, it } from 'vitest'
import { buildWeeklyBuckets, computeProgress, sortSessions, xpBetween, xpByKind } from '../src/lib/progress'
import { UNLOCKS } from '../src/data/unlocks'
import { STREAK_BONUS } from '../src/data/xp'
import { addDays, startOfWeek } from '../src/lib/dates'
import { TODAY, daysBefore, fullBodySession, makeGoal, makeLog, makeSession, makeSet } from './fixtures'

const run = (sessions: ReturnType<typeof makeSession>[], goals: ReturnType<typeof makeGoal>[] = [], acknowledged: string[] = []) =>
  computeProgress({ sessions, goals, acknowledged, today: TODAY })

describe('empty state', () => {
  it('returns a safe, level-1 snapshot with nothing unlocked', () => {
    const p = run([])
    expect(p.xp).toBe(0)
    expect(p.level.level).toBe(1)
    expect(p.level.title).toBe('Novice')
    expect(p.level.pct).toBe(0)
    expect(p.streak.current).toBe(0)
    expect(p.totals.workouts).toBe(0)
    expect(p.weekly).toEqual([])
    expect(p.xpEvents).toEqual([])
    expect(p.achievements.every((a) => !a.unlocked)).toBe(true)
    expect(p.unlockEvents).toEqual([])
    expect(p.prCount).toBe(0)
  })
})

describe('XP accrual', () => {
  it('awards XP for a completed session', () => {
    const p = run([fullBodySession(TODAY)])
    expect(p.xp).toBeGreaterThan(0)
    expect(p.xpEvents.length).toBeGreaterThan(0)
    expect(p.totals.workouts).toBe(1)
  })

  it('sums the event ledger to the total', () => {
    const sessions = [fullBodySession(daysBefore(4)), fullBodySession(daysBefore(2)), fullBodySession(TODAY)]
    const p = run(sessions)
    expect(p.xpEvents.reduce((n, e) => n + e.amount, 0)).toBe(p.xp)
  })

  it('tracks a running cumulative total on every event', () => {
    const p = run([fullBodySession(daysBefore(2)), fullBodySession(daysBefore(1)), fullBodySession(TODAY)])
    let running = 0
    for (const e of p.xpEvents) {
      running += e.amount
      expect(e.cumulative).toBe(running)
    }
  })

  it('awards nothing for a session with no completed sets', () => {
    const hollow = makeSession({
      date: TODAY,
      exercises: [makeLog('back-squat', [makeSet(5, 100, 8, { completed: false })])],
    })
    const p = run([hollow])
    expect(p.xp).toBe(0)
    expect(p.totals.workouts).toBe(0)
    expect(p.streak.current).toBe(0)
    expect(p.achievements.some((a) => a.unlocked)).toBe(false)
  })

  it('does not count a session where everything was skipped', () => {
    const skipped = makeSession({
      date: TODAY,
      exercises: [makeLog('back-squat', [], { skipped: true }), makeLog('bench-press', [], { skipped: true })],
    })
    const p = run([skipped])
    expect(p.xp).toBe(0)
    expect(p.totals.workouts).toBe(0)
    expect(p.weekly).toEqual([])
  })

  it('does not extend a streak with an empty session', () => {
    const real = [daysBefore(2), daysBefore(1)].map((d) => makeSession({ date: d }))
    const hollow = makeSession({
      date: TODAY,
      exercises: [makeLog('back-squat', [makeSet(5, 100, 8, { completed: false })])],
    })
    expect(run([...real, hollow]).streak.current).toBe(2)
  })

  it('awards less for a deload than for the same work at full intensity', () => {
    const exercises = [makeLog('back-squat', [makeSet(5, 80, 6), makeSet(5, 80, 6), makeSet(5, 80, 6)])]
    const normal = run([makeSession({ date: TODAY, exercises })])
    const deload = run([makeSession({ date: TODAY, exercises, deload: true })])
    // Compare the work itself: a deload also unlocks Deload Discipline, which
    // is a separate (and deserved) reward.
    const work = (events: { kind: string; amount: number }[]) =>
      events.filter((e) => e.kind === 'set' || e.kind === 'workout' || e.kind === 'volume').reduce((n, e) => n + e.amount, 0)
    expect(work(deload.xpEvents)).toBeLessThan(work(normal.xpEvents))
    expect(deload.xp).toBeGreaterThan(0)
    expect(deload.xpEvents.some((e) => e.label.toLowerCase().includes('deload'))).toBe(true)
  })

  it('groups XP by source', () => {
    const p = run([fullBodySession(daysBefore(1)), fullBodySession(TODAY)])
    const byKind = xpByKind(p.xpEvents)
    expect(byKind.set).toBeGreaterThan(0)
    expect(byKind.workout).toBeGreaterThan(0)
    expect(byKind.volume).toBeGreaterThan(0)
    expect(byKind.achievement).toBeGreaterThan(0)
    const total = Object.values(byKind).reduce((a, b) => a + b, 0)
    expect(total).toBe(p.xp)
  })

  it('is deterministic across repeated runs', () => {
    const sessions = [fullBodySession(daysBefore(3)), fullBodySession(daysBefore(1)), fullBodySession(TODAY)]
    expect(run(sessions).xp).toBe(run(sessions).xp)
    expect(run(sessions).level.level).toBe(run(sessions).level.level)
  })

  it('produces the same result regardless of input order', () => {
    const a = fullBodySession(daysBefore(5))
    const b = fullBodySession(daysBefore(2))
    const c = fullBodySession(TODAY)
    expect(run([a, b, c]).xp).toBe(run([c, a, b]).xp)
    expect(run([a, b, c]).streak.current).toBe(run([c, b, a]).streak.current)
  })
})

describe('levels', () => {
  it('levels up as XP accumulates and records each level-up', () => {
    const many = Array.from({ length: 14 }, (_, i) => fullBodySession(daysBefore(13 - i)))
    const p = run(many)
    expect(p.level.level).toBeGreaterThan(1)
    expect(p.levelHistory.length).toBeGreaterThan(1)
    expect(p.levelHistory[0].level).toBe(1)
    const levels = p.levelHistory.map((h) => h.level)
    expect(levels).toEqual([...levels].sort((x, y) => x - y))
  })

  it('never reports a level ahead of the XP curve', () => {
    const p = run(Array.from({ length: 6 }, (_, i) => fullBodySession(daysBefore(5 - i))))
    expect(p.xp).toBeGreaterThanOrEqual(p.level.floor)
    expect(p.xp).toBeLessThan(p.level.ceiling)
    expect(p.level.needed).toBe(p.level.ceiling - p.xp)
  })
})

describe('streak XP', () => {
  it('awards the 3-day bonus once on the third consecutive day', () => {
    const sessions = [daysBefore(2), daysBefore(1), TODAY].map((d) => makeSession({ date: d }))
    const p = run(sessions)
    const streakEvents = p.xpEvents.filter((e) => e.kind === 'streak')
    expect(streakEvents).toHaveLength(1)
    expect(streakEvents[0].amount).toBe(STREAK_BONUS[3])
    expect(streakEvents[0].label).toContain('3-day')
  })

  it('awards each milestone once as the streak grows', () => {
    const sessions = Array.from({ length: 8 }, (_, i) => makeSession({ date: daysBefore(7 - i) }))
    const p = run(sessions)
    const labels = p.xpEvents.filter((e) => e.kind === 'streak').map((e) => e.label)
    expect(labels).toContain('3-day streak')
    expect(labels).toContain('7-day streak')
    expect(labels).toHaveLength(2)
  })

  it('cannot be farmed by breaking and rebuilding the same streak', () => {
    const firstRun = [daysBefore(20), daysBefore(19), daysBefore(18)].map((d) => makeSession({ date: d }))
    const secondRun = [daysBefore(2), daysBefore(1), TODAY].map((d) => makeSession({ date: d }))
    const p = run([...firstRun, ...secondRun])
    expect(p.xpEvents.filter((e) => e.kind === 'streak')).toHaveLength(1)
    expect(p.streak.longest).toBe(3)
    expect(p.streak.current).toBe(3)
  })

  it('awards nothing when the days are not consecutive', () => {
    const p = run([daysBefore(6), daysBefore(4), daysBefore(2), TODAY].map((d) => makeSession({ date: d })))
    expect(p.xpEvents.filter((e) => e.kind === 'streak')).toHaveLength(0)
    expect(p.streak.current).toBe(1)
  })
})

describe('personal records inside the replay', () => {
  it('awards PR XP and counts the records', () => {
    const sessions = [
      makeSession({ date: daysBefore(5), exercises: [makeLog('back-squat', [makeSet(5, 100, 8)])] }),
      makeSession({ date: daysBefore(2), exercises: [makeLog('back-squat', [makeSet(5, 105, 8)])] }),
      makeSession({ date: TODAY, exercises: [makeLog('back-squat', [makeSet(5, 110, 8)])] }),
    ]
    const p = run(sessions)
    expect(p.prCount).toBeGreaterThan(0)
    expect(p.xpEvents.some((e) => e.kind === 'pr')).toBe(true)
    expect(p.prs['back-squat'].bestWeight).toBe(110)
  })

  it('caps PR XP within a single session', () => {
    // Ten exercises improving at once should not dwarf the rest of the session.
    const exercises = ['back-squat', 'bench-press', 'overhead-press', 'barbell-row', 'romanian-deadlift', 'lat-pulldown', 'leg-press', 'hip-thrust', 'incline-db-curl', 'db-lateral-raise'].map(
      (id, i) => makeLog(id, [makeSet(5 + i, 50 + i * 5, 8)]),
    )
    const p = run([makeSession({ date: TODAY, exercises })])
    const prXp = p.xpEvents.filter((e) => e.kind === 'pr').reduce((n, e) => n + e.amount, 0)
    expect(prXp).toBeLessThanOrEqual(150)
  })
})

describe('achievements inside the replay', () => {
  it('unlocks First Blood on the first session with a real timestamp and reason', () => {
    const session = makeSession({ date: TODAY, title: 'Monday Upper' })
    const state = run([session]).achievements.find((a) => a.id === 'first-workout')
    expect(state?.unlocked).toBe(true)
    expect(state?.unlockedAt).toBe(session.completedAt)
    expect(state?.reason).toContain('Monday Upper')
  })

  it('unlocks a count achievement on the session that crosses the threshold, not later', () => {
    const sessions = Array.from({ length: 12 }, (_, i) => makeSession({ date: daysBefore(11 - i), title: `S${i + 1}` }))
    const p = run(sessions)
    const ten = p.achievements.find((a) => a.id === 'workouts-10')
    expect(ten?.unlocked).toBe(true)
    expect(ten?.unlockedAt).toBe(sessions[9].completedAt)
  })

  it('awards the achievement XP into the ledger', () => {
    const p = run([makeSession({ date: TODAY })])
    const kinds = p.xpEvents.filter((e) => e.kind === 'achievement')
    expect(kinds.length).toBeGreaterThan(0)
    expect(kinds.every((k) => k.amount > 0)).toBe(true)
  })

  it('converges when achievement XP itself triggers a level-gated achievement', () => {
    // Enough sessions to cross level 5 purely on work, then confirm the
    // level-based achievement is credited without an infinite loop.
    const sessions = Array.from({ length: 20 }, (_, i) => fullBodySession(daysBefore(19 - i)))
    const p = run(sessions)
    expect(p.level.level).toBeGreaterThanOrEqual(5)
    expect(p.achievements.find((a) => a.id === 'level-5')?.unlocked).toBe(true)
    expect(p.xpEvents.reduce((n, e) => n + e.amount, 0)).toBe(p.xp)
  })

  it('does not re-notify achievements the user has already acknowledged', () => {
    const sessions = [makeSession({ date: daysBefore(1) }), makeSession({ date: TODAY })]
    const first = run(sessions)
    expect(first.newlyUnlocked.length).toBeGreaterThan(0)
    const second = run(sessions, [], first.newlyUnlocked)
    expect(second.newlyUnlocked).toEqual([])
    // Acknowledging changes nothing about what was actually earned.
    expect(second.xp).toBe(first.xp)
    expect(second.achievements.filter((a) => a.unlocked).length)
      .toBe(first.achievements.filter((a) => a.unlocked).length)
  })
})

describe('unlocks inside the replay', () => {
  it('unlocks nothing for a brand-new user beyond the always-available content', () => {
    const p = run([])
    expect(p.unlockedIds).toEqual([])
    expect(p.unlockEvents).toEqual([])
  })

  it('unlocks the intermediate programme after enough real work', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => makeSession({ date: daysBefore(9 - i) }))
    const p = run(sessions)
    const event = p.unlockEvents.find((u) => u.id === 'program-intermediate')
    expect(event).toBeDefined()
    expect(event?.grants).toBe('intermediate-upper-lower')
    expect(event?.reason.length).toBeGreaterThan(0)
    expect(event?.levelAtUnlock).toBeGreaterThanOrEqual(1)
    expect(p.unlockedIds).toContain('program-intermediate')
  })

  it('unlocks a theme at the required level', () => {
    const sessions = Array.from({ length: 8 }, (_, i) => fullBodySession(daysBefore(7 - i)))
    const p = run(sessions)
    if (p.level.level >= 3) {
      expect(p.unlockedIds).toContain('theme-frost')
      const event = p.unlockEvents.find((u) => u.id === 'theme-frost')
      expect(event?.kind).toBe('theme')
      expect(event?.grants).toBe('frost')
    }
  })

  it('never unlocks more than the catalogue contains, and never twice', () => {
    const sessions = Array.from({ length: 40 }, (_, i) => fullBodySession(daysBefore(39 - i)))
    const p = run(sessions)
    expect(p.unlockedIds.length).toBeLessThanOrEqual(UNLOCKS.length)
    expect(new Set(p.unlockedIds).size).toBe(p.unlockedIds.length)
    expect(new Set(p.unlockEvents.map((u) => u.id)).size).toBe(p.unlockEvents.length)
  })

  it('records unlock events in chronological order', () => {
    const sessions = Array.from({ length: 30 }, (_, i) => fullBodySession(daysBefore(29 - i)))
    const times = run(sessions).unlockEvents.map((u) => u.unlockedAt)
    expect(times).toEqual([...times].sort())
  })
})

describe('goals feed the ledger', () => {
  it('awards XP for a completed goal, dated at completion', () => {
    const completedAt = new Date(`${daysBefore(1)}T20:00:00`).toISOString()
    const goal = makeGoal({ title: 'Train three times a week', metric: 'workouts', target: 3, completedAt })
    const p = run([makeSession({ date: daysBefore(2) })], [goal])
    const event = p.xpEvents.find((e) => e.kind === 'goal')
    expect(event?.amount).toBe(100)
    expect(event?.label).toContain('Train three times a week')
    expect(event?.date).toBe(daysBefore(1))
    expect(p.totals.goalsCompleted).toBe(1)
  })

  it('awards XP for each completed milestone', () => {
    const goal = makeGoal({
      milestones: [
        { id: 'm1', label: 'First week done', done: true, completedAt: new Date(`${daysBefore(3)}T10:00:00`).toISOString() },
        { id: 'm2', label: 'Second week done', done: true, completedAt: new Date(`${daysBefore(2)}T10:00:00`).toISOString() },
        { id: 'm3', label: 'Not yet', done: false },
      ],
    })
    const p = run([], [goal])
    expect(p.xpEvents.filter((e) => e.kind === 'goal-milestone')).toHaveLength(2)
  })

  it('ignores goals that were never completed', () => {
    const p = run([], [makeGoal({ title: 'Someday' })])
    expect(p.xpEvents.filter((e) => e.kind === 'goal')).toHaveLength(0)
    expect(p.totals.goalsCompleted).toBe(0)
  })
})

describe('weekly buckets', () => {
  it('is contiguous and keeps empty weeks as honest zeros', () => {
    const sessions = [makeSession({ date: daysBefore(21) }), makeSession({ date: TODAY })]
    const p = run(sessions)
    expect(p.weekly.length).toBeGreaterThanOrEqual(4)
    for (let i = 1; i < p.weekly.length; i++) {
      expect(addDays(p.weekly[i - 1].weekStart, 7)).toBe(p.weekly[i].weekStart)
    }
    const emptyWeeks = p.weekly.filter((w) => w.workouts === 0)
    expect(emptyWeeks.length).toBeGreaterThan(0)
    expect(emptyWeeks.every((w) => w.sets === 0 && w.volumeKg === 0 && w.xp === 0)).toBe(true)
  })

  it('starts on the configured week start', () => {
    const sessions = [makeSession({ date: TODAY })]
    const monday = buildWeeklyBuckets(sessions, [], 1, TODAY)
    const sunday = buildWeeklyBuckets(sessions, [], 0, TODAY)
    expect(monday[monday.length - 1].weekStart).toBe(startOfWeek(TODAY, 1))
    expect(sunday[sunday.length - 1].weekStart).toBe(startOfWeek(TODAY, 0))
  })

  it('returns nothing when there is no history', () => {
    expect(buildWeeklyBuckets([], [], 1, TODAY)).toEqual([])
  })

  it('aggregates workouts, sets, volume, duration and XP per week', () => {
    const weekStart = startOfWeek(TODAY, 1)
    const sessions = [fullBodySession(weekStart), fullBodySession(addDays(weekStart, 2))]
    const p = run(sessions)
    const last = p.weekly[p.weekly.length - 1]
    expect(last.workouts).toBe(2)
    expect(last.sets).toBe(sessions[0].completedSets * 2)
    expect(last.volumeKg).toBeGreaterThan(0)
    expect(last.xp).toBeGreaterThan(0)
  })
})

describe('totals', () => {
  it('accumulates workouts, sets, volume, duration and distinct exercises', () => {
    const sessions = [fullBodySession(daysBefore(2)), fullBodySession(TODAY)]
    const t = run(sessions).totals
    expect(t.workouts).toBe(2)
    expect(t.sets).toBe(18) // 9 sets per full-body session
    expect(t.volumeKg).toBeGreaterThan(0)
    expect(t.durationMin).toBe(116)
    expect(t.distinctExercises).toBe(3)
    expect(t.firstWorkoutAt).toBe(sessions[0].completedAt)
    expect(t.lastWorkoutAt).toBe(sessions[1].completedAt)
  })

  it('does not count a skipped exercise as distinct', () => {
    const session = makeSession({
      exercises: [
        makeLog('back-squat', [makeSet(5, 100)]),
        makeLog('bench-press', [makeSet(5, 60)], { skipped: true }),
      ],
    })
    expect(run([session]).totals.distinctExercises).toBe(1)
  })
})

describe('deleting history removes what it awarded', () => {
  it('drops XP, level, streak and achievements when the session goes', () => {
    const sessions = [makeSession({ date: daysBefore(1) }), makeSession({ date: TODAY })]
    const withBoth = run(sessions)
    const withOne = run([sessions[0]])
    const withNone = run([])

    expect(withBoth.xp).toBeGreaterThan(withOne.xp)
    expect(withOne.xp).toBeGreaterThan(withNone.xp)
    expect(withBoth.streak.current).toBe(2)
    expect(withOne.streak.current).toBe(1)
    expect(withNone.streak.current).toBe(0)
    expect(withBoth.achievements.filter((a) => a.unlocked).length)
      .toBeGreaterThan(withNone.achievements.filter((a) => a.unlocked).length)
  })
})

describe('helpers', () => {
  it('sortSessions orders by date then completion time', () => {
    const late = makeSession({ id: 'b', date: TODAY, hour: 20 })
    const early = makeSession({ id: 'a', date: TODAY, hour: 7 })
    const yesterday = makeSession({ id: 'c', date: daysBefore(1) })
    expect(sortSessions([late, yesterday, early]).map((s) => s.id)).toEqual(['c', 'a', 'b'])
  })

  it('xpBetween sums a closed date range', () => {
    const p = run([fullBodySession(daysBefore(5)), fullBodySession(TODAY)])
    const all = xpBetween(p.xpEvents, daysBefore(10), TODAY)
    expect(all).toBe(p.xp)
    expect(xpBetween(p.xpEvents, TODAY, TODAY)).toBeLessThan(all)
    expect(xpBetween(p.xpEvents, daysBefore(1), daysBefore(1))).toBe(0)
  })
})

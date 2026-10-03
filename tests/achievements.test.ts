import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, TOTAL_ACHIEVEMENT_XP, describeProgress, evaluateAchievement, evaluateAll } from '../src/lib/achievements'
import { emptyStats, type ProgressStats } from '../src/lib/stats'
import type { Achievement } from '../src/types'
import { makeLog, makeSession, makeSet, TODAY, daysBefore } from './fixtures'

/** Stats with overrides — the fastest way to probe a single condition. */
function stats(overrides: Partial<ProgressStats> = {}): ProgressStats {
  return { ...emptyStats(), ...overrides }
}

const byId = (id: string) => {
  const a = ACHIEVEMENT_MAP[id]
  if (!a) throw new Error(`Unknown achievement ${id}`)
  return a
}

describe('achievement catalogue', () => {
  it('has unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every achievement a name, description, requirement and icon', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length, a.id).toBeGreaterThan(0)
      expect(a.description.length, a.id).toBeGreaterThan(0)
      expect(a.requirement.length, a.id).toBeGreaterThan(0)
      expect(a.icon.length, a.id).toBeGreaterThan(0)
      expect(a.xp, a.id).toBeGreaterThan(0)
    }
  })

  it('awards a positive, finite XP total', () => {
    expect(Number.isFinite(TOTAL_ACHIEVEMENT_XP)).toBe(true)
    expect(TOTAL_ACHIEVEMENT_XP).toBe(ACHIEVEMENTS.reduce((n, a) => n + a.xp, 0))
    // Enough that completing everything is a meaningful chunk of the level curve,
    // but not so much that achievements alone carry the progression.
    expect(TOTAL_ACHIEVEMENT_XP).toBeGreaterThan(3000)
    expect(TOTAL_ACHIEVEMENT_XP).toBeLessThan(20000)
  })

  it('covers every declared category', () => {
    const categories = new Set(ACHIEVEMENTS.map((a) => a.category))
    for (const expected of ['volume', 'consistency', 'strength', 'milestone', 'exploration', 'discipline']) {
      expect(categories.has(expected as never), expected).toBe(true)
    }
  })

  it('has no two achievements with identical conditions (no duplicates)', () => {
    const keys = ACHIEVEMENTS.map((a) => JSON.stringify(a.condition))
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i)
    expect(dupes).toEqual([])
  })
})

describe('count-based conditions', () => {
  it('unlocks workouts at the exact threshold and not before', () => {
    const a = byId('workouts-10')
    expect(evaluateAchievement(a, stats({ workouts: 9 })).met).toBe(false)
    expect(evaluateAchievement(a, stats({ workouts: 10 })).met).toBe(true)
    expect(evaluateAchievement(a, stats({ workouts: 11 })).met).toBe(true)
  })

  it('unlocks sets, volume, duration and distinct exercises', () => {
    expect(evaluateAchievement(byId('sets-100'), stats({ sets: 100 })).met).toBe(true)
    expect(evaluateAchievement(byId('volume-1t'), stats({ volumeKg: 999 })).met).toBe(false)
    expect(evaluateAchievement(byId('volume-1t'), stats({ volumeKg: 1000 })).met).toBe(true)
    expect(evaluateAchievement(byId('time-10h'), stats({ durationMin: 600 })).met).toBe(true)
    expect(evaluateAchievement(byId('exercises-10'), stats({ distinctExercises: 10 })).met).toBe(true)
  })

  it('reports honest partial progress', () => {
    const e = evaluateAchievement(byId('workouts-25'), stats({ workouts: 10 }))
    expect(e.met).toBe(false)
    expect(e.progress).toBe(10)
    expect(e.target).toBe(25)
    expect(describeProgress(byId('workouts-25'), e)).toBe('10 / 25')
  })

  it('formats volume and duration progress in their own units', () => {
    expect(describeProgress(byId('volume-10t'), evaluateAchievement(byId('volume-10t'), stats({ volumeKg: 4200 })))).toBe('4,200 / 10,000 kg')
    expect(describeProgress(byId('time-50h'), evaluateAchievement(byId('time-50h'), stats({ durationMin: 900 })))).toBe('15 h / 50 h')
  })
})

describe('streak conditions', () => {
  it('unlocks from either the current or the longest streak', () => {
    const a = byId('streak-7')
    expect(evaluateAchievement(a, stats({ streak: 7, longestStreak: 7 })).met).toBe(true)
    // A broken 7-day streak should still have unlocked it historically.
    expect(evaluateAchievement(a, stats({ streak: 0, longestStreak: 9 })).met).toBe(true)
    expect(evaluateAchievement(a, stats({ streak: 3, longestStreak: 3 })).met).toBe(false)
  })

  it('unlocks perfect-week achievements from attendance', () => {
    expect(evaluateAchievement(byId('perfect-week'), stats({ perfectWeeks: 1 })).met).toBe(true)
    expect(evaluateAchievement(byId('perfect-weeks-4'), stats({ perfectWeeks: 3 })).met).toBe(false)
    expect(evaluateAchievement(byId('perfect-weeks-4'), stats({ perfectWeeks: 4 })).met).toBe(true)
  })
})

describe('session-scanning conditions', () => {
  it('counts long sessions above the threshold only', () => {
    const a = byId('session-long')
    const sessions = [
      makeSession({ date: daysBefore(3), durationMin: 74 }),
      makeSession({ date: daysBefore(2), durationMin: 75 }),
      makeSession({ date: daysBefore(1), durationMin: 90 }),
    ]
    expect(evaluateAchievement(a, stats({ sessions })).met).toBe(true)
    expect(evaluateAchievement(a, stats({ sessions: sessions.slice(0, 1) })).met).toBe(false)
  })

  it('grants a bodyweight-multiple achievement only with a recorded bodyweight', () => {
    const a = byId('bw-bench')
    const bench = [makeSession({ exercises: [makeLog('bench-press', [makeSet(5, 80, 8)])] })]

    // No bodyweight on file → cannot be judged, so it stays locked at 0.
    const unknown = evaluateAchievement(a, stats({ sessions: bench }))
    expect(unknown.met).toBe(false)
    expect(unknown.progress).toBe(0)

    // 80 kg bench at 90 kg bodyweight = 0.89× — not there yet.
    const close = evaluateAchievement(a, stats({ sessions: bench, bodyweightKg: 90 }))
    expect(close.met).toBe(false)
    expect(close.progress).toBeCloseTo(0.89, 2)
    expect(close.target).toBe(1)

    // 80 kg bench at 80 kg bodyweight = 1.0× — earned.
    expect(evaluateAchievement(a, stats({ sessions: bench, bodyweightKg: 80 })).met).toBe(true)
    // And at 75 kg bodyweight it is comfortably over.
    expect(evaluateAchievement(a, stats({ sessions: bench, bodyweightKg: 75 })).met).toBe(true)
  })

  it('requires the stated rep count for a bodyweight multiple', () => {
    const a = byId('bw-squat')
    // 80 kg for 3 reps at 80 kg bodyweight: heavy enough, but not 5 reps.
    const short = [makeSession({ exercises: [makeLog('back-squat', [makeSet(3, 80, 9)])] })]
    expect(evaluateAchievement(a, stats({ sessions: short, bodyweightKg: 80 })).met).toBe(false)

    const full = [makeSession({ exercises: [makeLog('back-squat', [makeSet(5, 80, 9)])] })]
    expect(evaluateAchievement(a, stats({ sessions: full, bodyweightKg: 80 })).met).toBe(true)
  })

  it('does not credit a different exercise toward a bodyweight multiple', () => {
    const a = byId('bw-bench')
    const sessions = [makeSession({ exercises: [makeLog('back-squat', [makeSet(5, 200, 8)])] })]
    expect(evaluateAchievement(a, stats({ sessions, bodyweightKg: 80 })).met).toBe(false)
  })

  it('ignores warm-up sets for bodyweight multiples', () => {
    const a = byId('bw-bench')
    const sessions = [
      makeSession({ exercises: [makeLog('bench-press', [makeSet(5, 80, 6, { warmup: true })])] }),
    ]
    expect(evaluateAchievement(a, stats({ sessions, bodyweightKg: 80 })).met).toBe(false)
  })
})

describe('discipline conditions', () => {
  it('tracks notes, deloads, weekends and time of day', () => {
    expect(evaluateAchievement(byId('note-taker'), stats({ sessionsWithNotes: 5 })).met).toBe(true)
    expect(evaluateAchievement(byId('note-taker'), stats({ sessionsWithNotes: 4 })).met).toBe(false)
    expect(evaluateAchievement(byId('deload-discipline'), stats({ deloadSessions: 1 })).met).toBe(true)
    expect(evaluateAchievement(byId('weekend-warrior'), stats({ weekendSessions: 5 })).met).toBe(true)
    expect(evaluateAchievement(byId('early-bird'), stats({ earlySessions: 10 })).met).toBe(true)
    expect(evaluateAchievement(byId('night-owl'), stats({ lateSessions: 9 })).met).toBe(false)
  })
})

describe('level, XP, goal and programme conditions', () => {
  it('unlocks on level and lifetime XP', () => {
    expect(evaluateAchievement(byId('level-5'), stats({ level: 5 })).met).toBe(true)
    expect(evaluateAchievement(byId('level-5'), stats({ level: 4 })).met).toBe(false)
    expect(evaluateAchievement(byId('xp-5000'), stats({ xp: 5000 })).met).toBe(true)
    expect(evaluateAchievement(byId('xp-5000'), stats({ xp: 4999 })).met).toBe(false)
  })

  it('unlocks on goals and programme blocks', () => {
    expect(evaluateAchievement(byId('goal-1'), stats({ goalsCompleted: 1 })).met).toBe(true)
    expect(evaluateAchievement(byId('goals-3'), stats({ goalsCompleted: 2 })).met).toBe(false)
    expect(evaluateAchievement(byId('block-one'), stats({ programmeBlocks: 1 })).met).toBe(true)
    expect(evaluateAchievement(byId('programme-complete'), stats({ programmeBlocks: 5 })).met).toBe(true)
  })

  it('unlocks PR-count achievements from real record events', () => {
    expect(evaluateAchievement(byId('first-pr'), stats({ prEvents: 1 })).met).toBe(true)
    expect(evaluateAchievement(byId('prs-25'), stats({ prEvents: 24 })).met).toBe(false)
    expect(evaluateAchievement(byId('prs-25'), stats({ prEvents: 25 })).met).toBe(true)
  })
})

describe('evaluateAll', () => {
  it('evaluates every achievement', () => {
    const results = evaluateAll(stats({ workouts: 1, sets: 5 }))
    expect(Object.keys(results)).toHaveLength(ACHIEVEMENTS.length)
    expect(results['first-workout'].met).toBe(true)
    expect(results['first-set'].met).toBe(true)
    expect(results['workouts-100'].met).toBe(false)
  })

  it('keeps an already-unlocked achievement unlocked even if the evidence disappears', () => {
    // Clearing your bodyweight must not retroactively revoke an earned record.
    const already = new Set(['bw-bench'])
    const results = evaluateAll(stats({ bodyweightKg: undefined, sessions: [] }), already)
    expect(results['bw-bench'].met).toBe(true)
  })

  it('reports zero progress for a brand-new user', () => {
    const results = evaluateAll(stats())
    const unlocked = Object.values(results).filter((r) => r.met)
    expect(unlocked).toHaveLength(0)
    expect(results['first-workout'].progress).toBe(0)
  })
})

describe('unknown conditions fail closed', () => {
  it('never grants an achievement it cannot verify', () => {
    const future: Achievement = {
      ...byId('first-workout'),
      // A condition type from a newer schema version than this build understands.
      condition: { type: 'some-future-metric' } as unknown as Achievement['condition'],
    }
    expect(evaluateAchievement(future, stats({ workouts: 999 })).met).toBe(false)
    expect(evaluateAchievement(future, stats({ workouts: 999 })).target).toBe(1)
  })
})

describe('session-driven unlocking end to end', () => {
  it('unlocks First Blood from a real logged session, dated correctly', async () => {
    const { computeProgress } = await import('../src/lib/progress')
    const session = makeSession({ date: TODAY, title: 'First ever session' })
    const snapshot = computeProgress({ sessions: [session], goals: [], today: TODAY })
    const state = snapshot.achievements.find((a) => a.id === 'first-workout')

    expect(state?.unlocked).toBe(true)
    expect(state?.unlockedAt).toBe(session.completedAt)
    expect(state?.reason).toContain('First ever session')
  })
})

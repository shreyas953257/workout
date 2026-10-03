import { describe, expect, it } from 'vitest'
import { estimateSessionXp, sessionBaseXp, sessionCompletedSets, sessionVolumeKg, setXp, withComputedTotals } from '../src/lib/xp'
import { rpeMultiplier } from '../src/data/xp'
import { makeLog, makeSession, makeSet } from './fixtures'

describe('RPE multiplier', () => {
  it('rewards harder sets and discounts easy ones', () => {
    expect(rpeMultiplier(6)).toBe(0.8)
    expect(rpeMultiplier(8)).toBe(1)
    expect(rpeMultiplier(9)).toBe(1.1)
    expect(rpeMultiplier(10)).toBe(1.2)
  })

  it('handles half steps', () => {
    expect(rpeMultiplier(7.5)).toBe(0.95)
    expect(rpeMultiplier(8.5)).toBe(1.05)
  })

  it('defaults to neutral when RPE is missing or invalid', () => {
    expect(rpeMultiplier(undefined)).toBe(1)
    expect(rpeMultiplier(Number.NaN)).toBe(1)
  })

  it('clamps out-of-range RPE instead of extrapolating', () => {
    expect(rpeMultiplier(1)).toBe(rpeMultiplier(5))
    expect(rpeMultiplier(20)).toBe(rpeMultiplier(10))
  })
})

describe('setXp', () => {
  it('prices a compound set at RPE 8 as the base value', () => {
    expect(setXp(makeSet(5, 100, 8), 'back-squat')).toBe(12)
  })

  it('scales with RPE', () => {
    expect(setXp(makeSet(5, 100, 6), 'back-squat')).toBe(10) // 12 × 0.8 = 9.6 → 10
    expect(setXp(makeSet(5, 100, 9), 'back-squat')).toBe(13) // 12 × 1.1 = 13.2 → 13
    expect(setXp(makeSet(5, 100, 10), 'back-squat')).toBe(14) // 12 × 1.2 = 14.4 → 14
  })

  it('prices isolation and core work below compounds', () => {
    expect(setXp(makeSet(12, 14, 8), 'incline-db-curl')).toBe(7)
    expect(setXp(makeSet(10, 0, 8), 'plank')).toBe(6)
  })

  it('awards nothing for a warm-up set', () => {
    expect(setXp(makeSet(10, 20, 6, { warmup: true }), 'back-squat')).toBe(0)
  })

  it('awards nothing for an incomplete set', () => {
    expect(setXp(makeSet(5, 100, 8, { completed: false }), 'back-squat')).toBe(0)
  })

  it('discounts deload work', () => {
    expect(setXp(makeSet(5, 80, 6), 'back-squat', true)).toBe(6) // 12 × 0.8 × 0.6 = 5.76 → 6
  })

  it('falls back to accessory pricing for an unknown exercise id', () => {
    expect(setXp(makeSet(10, 40, 8), 'not-in-the-library')).toBe(9)
  })
})

describe('sessionVolumeKg', () => {
  it('is weight × reps summed over completed, non-warm-up rep sets', () => {
    const session = makeSession({
      exercises: [makeLog('back-squat', [makeSet(5, 100), makeSet(5, 100), makeSet(5, 100)])],
    })
    expect(sessionVolumeKg(session)).toBe(1500)
  })

  it('excludes warm-up sets', () => {
    const session = makeSession({
      exercises: [
        makeLog('back-squat', [makeSet(10, 20, 6, { warmup: true }), makeSet(5, 100, 8)]),
      ],
    })
    expect(sessionVolumeKg(session)).toBe(500)
  })

  it('excludes incomplete sets', () => {
    const session = makeSession({
      exercises: [makeLog('back-squat', [makeSet(5, 100), makeSet(3, 100, 10, { completed: false })])],
    })
    expect(sessionVolumeKg(session)).toBe(500)
  })

  it('counts bodyweight work as zero external volume rather than guessing', () => {
    const session = makeSession({
      exercises: [makeLog('push-up', [makeSet(20, 0), makeSet(20, 0)])],
    })
    expect(sessionVolumeKg(session)).toBe(0)
  })

  it('counts timed and distance work as zero volume', () => {
    const session = makeSession({
      exercises: [
        makeLog('plank', [makeSet(60, 0)], { unit: 'seconds' }),
        makeLog('farmers-carry', [makeSet(40, 32)], { unit: 'metres' }),
      ],
    })
    expect(sessionVolumeKg(session)).toBe(0)
  })
})

describe('sessionCompletedSets', () => {
  it('counts only completed non-warm-up sets', () => {
    const session = makeSession({
      exercises: [
        makeLog('back-squat', [makeSet(10, 20, 6, { warmup: true }), makeSet(5, 100), makeSet(5, 100)]),
        makeLog('bench-press', [makeSet(5, 60), makeSet(4, 60, 10, { completed: false })]),
      ],
    })
    expect(sessionCompletedSets(session)).toBe(3)
  })
})

describe('sessionBaseXp', () => {
  it('sums set XP, exercise bonus, completion bonus and volume bonus', () => {
    const session = makeSession({
      exercises: [
        makeLog('back-squat', [makeSet(5, 100, 8), makeSet(5, 100, 8), makeSet(5, 100, 8)]),
        makeLog('bench-press', [makeSet(5, 60, 8), makeSet(5, 60, 8), makeSet(5, 60, 8)]),
      ],
    })
    const result = sessionBaseXp(session)

    // 6 compound sets × 12 = 72
    expect(result.breakdown.find((b) => b.kind === 'set')?.amount).toBe(72)
    // 2 exercises × 6 = 12
    expect(result.breakdown.find((b) => b.label.includes('exercise'))?.amount).toBe(12)
    // volume: squat 3×(5×100)=1500 + bench 3×(5×60)=900 → 2400 kg → floor(2400/100) = 24
    expect(result.breakdown.find((b) => b.kind === 'volume')?.amount).toBe(24)
    expect(result.volumeKg).toBe(2400)
    // finishing
    expect(result.breakdown.find((b) => b.label === 'Workout completed')?.amount).toBe(40)

    expect(result.total).toBe(72 + 12 + 24 + 40)
    expect(result.completedSets).toBe(6)
    expect(result.completedExercises).toBe(2)
  })

  it('caps the per-exercise bonus', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeLog('incline-db-curl', [makeSet(10, 10, 8)], { name: `Curl ${i}` }),
    )
    const result = sessionBaseXp(makeSession({ exercises: many }))
    const bonus = result.breakdown.find((b) => b.label.includes('exercise'))?.amount ?? 0
    expect(bonus).toBe(48) // 12 × 6 = 72, capped at 48
  })

  it('caps the volume bonus at 100', () => {
    const session = makeSession({
      exercises: [makeLog('conventional-deadlift', [makeSet(5, 200), makeSet(5, 200), makeSet(5, 200)])],
    })
    // 3000 kg → floor(3000/100) = 30... push past the cap
    const huge = makeSession({
      exercises: [
        makeLog('leg-press', Array.from({ length: 10 }, () => makeSet(20, 400))),
      ],
    })
    expect(sessionBaseXp(session).breakdown.find((b) => b.kind === 'volume')?.amount).toBe(30)
    expect(sessionBaseXp(huge).breakdown.find((b) => b.kind === 'volume')?.amount).toBe(100)
  })

  it('awards nothing at all for a session with no completed sets', () => {
    const empty = makeSession({ exercises: [makeLog('back-squat', [makeSet(5, 100, 8, { completed: false })])] })
    expect(sessionBaseXp(empty).total).toBe(0)

    const noExercises = makeSession({ exercises: [] })
    expect(sessionBaseXp(noExercises).total).toBe(0)
  })

  it('awards nothing for a fully skipped session', () => {
    const skipped = makeSession({
      exercises: [makeLog('back-squat', [makeSet(5, 100, 8)], { skipped: true })],
    })
    expect(sessionBaseXp(skipped).total).toBe(0)
  })

  it('is deterministic — the same session always yields the same XP', () => {
    const build = () =>
      makeSession({
        exercises: [
          makeLog('back-squat', [makeSet(5, 100, 8), makeSet(5, 100, 8.5)]),
          makeLog('overhead-press', [makeSet(5, 40, 8)]),
        ],
      })
    expect(sessionBaseXp(build()).total).toBe(sessionBaseXp(build()).total)
  })

  it('awards less for a deload than for the same work at full intensity', () => {
    const exercises = [makeLog('back-squat', [makeSet(5, 80, 6), makeSet(5, 80, 6)])]
    const normal = sessionBaseXp(makeSession({ exercises }))
    const deload = sessionBaseXp(makeSession({ exercises, deload: true }))
    expect(deload.total).toBeLessThan(normal.total)
    expect(deload.breakdown.some((b) => b.label.includes('Deload'))).toBe(true)
  })

  it('produces a breakdown whose parts sum to the total', () => {
    const session = makeSession({
      exercises: [
        makeLog('back-squat', [makeSet(5, 100, 8), makeSet(5, 100, 9)]),
        makeLog('plank', [makeSet(45, 0, 8)], { unit: 'seconds' }),
        makeLog('face-pull', [makeSet(15, 20, 8)]),
      ],
    })
    const result = sessionBaseXp(session)
    expect(result.breakdown.reduce((n, b) => n + b.amount, 0)).toBe(result.total)
    expect(result.breakdown.every((b) => Number.isInteger(b.amount) && b.amount > 0)).toBe(true)
  })
})

describe('withComputedTotals', () => {
  it('freezes xp, volume and set count onto the session', () => {
    const session = makeSession({
      exercises: [makeLog('back-squat', [makeSet(5, 100, 8), makeSet(5, 100, 8)])],
    })
    expect(session.xp).toBeGreaterThan(0)
    expect(session.volumeKg).toBe(1000)
    expect(session.completedSets).toBe(2)
    expect(session.xpBreakdown.length).toBeGreaterThan(0)
  })

  it('overwrites untrustworthy totals supplied by an import', () => {
    const raw = {
      ...makeSession({ exercises: [makeLog('back-squat', [makeSet(5, 100, 8)])] }),
      xp: 999999,
      volumeKg: -500,
      completedSets: 4242,
    }
    const fixed = withComputedTotals(raw)
    expect(fixed.xp).toBeLessThan(200)
    expect(fixed.volumeKg).toBe(500)
    expect(fixed.completedSets).toBe(1)
  })
})

describe('estimateSessionXp', () => {
  it('approximates what a real session of the same shape would award', () => {
    const estimate = estimateSessionXp(['back-squat', 'bench-press', 'barbell-row'], 3)
    const actual = sessionBaseXp(
      makeSession({
        exercises: [
          makeLog('back-squat', Array.from({ length: 3 }, () => makeSet(5, 100, 8))),
          makeLog('bench-press', Array.from({ length: 3 }, () => makeSet(5, 60, 8))),
          makeLog('barbell-row', Array.from({ length: 3 }, () => makeSet(8, 50, 8))),
        ],
      }),
    )
    // The estimate ignores the volume bonus, so it should land within 40% below.
    expect(estimate).toBeGreaterThan(actual.total * 0.6)
    expect(estimate).toBeLessThanOrEqual(actual.total)
  })

  it('returns zero-ish for an empty prescription', () => {
    expect(estimateSessionXp([], 3)).toBe(40) // completion bonus only
  })
})

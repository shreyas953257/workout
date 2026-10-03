import { describe, expect, it } from 'vitest'
import { prCount, recentPrEvents, scanPersonalRecords, suggestedWeight, topRecords, totalPrEvents } from '../src/lib/prs'
import { estimatedOneRepMax } from '../src/data/rpe'
import { addDays } from '../src/lib/dates'
import { TODAY, daysBefore, makeLog, makeSession, makeSet } from './fixtures'

describe('Epley estimate', () => {
  it('returns the weight itself for a single', () => {
    expect(estimatedOneRepMax(100, 1)).toBe(100)
  })

  it('applies weight × (1 + reps ÷ 30)', () => {
    expect(estimatedOneRepMax(100, 5)).toBeCloseTo(116.7, 1)
    expect(estimatedOneRepMax(60, 10)).toBeCloseTo(80, 1)
  })

  it('caps the extrapolation at 10 reps so the estimate does not diverge', () => {
    expect(estimatedOneRepMax(50, 20)).toBe(estimatedOneRepMax(50, 10))
  })

  it('rejects nonsense input', () => {
    expect(estimatedOneRepMax(0, 5)).toBe(0)
    expect(estimatedOneRepMax(100, 0)).toBe(0)
    expect(estimatedOneRepMax(-10, 5)).toBe(0)
    expect(estimatedOneRepMax(Number.NaN, 5)).toBe(0)
  })
})

describe('scanPersonalRecords', () => {
  it('records nothing for an empty log', () => {
    const result = scanPersonalRecords([])
    expect(result.records).toEqual({})
    expect(result.events).toHaveLength(0)
    expect(result.bySession).toEqual({})
  })

  it('establishes four records from a first session', () => {
    const session = makeSession({
      date: TODAY,
      exercises: [makeLog('back-squat', [makeSet(5, 100, 8), makeSet(5, 100, 8)])],
    })
    const { records, events } = scanPersonalRecords([session])
    const rec = records['back-squat']

    expect(rec.bestWeight).toBe(100)
    expect(rec.bestWeightReps).toBe(5)
    expect(rec.bestReps).toBe(5)
    expect(rec.bestE1rm).toBeCloseTo(116.7, 1)
    expect(rec.bestVolume).toBe(500)
    expect(rec.totalSets).toBe(2)
    expect(rec.bestWeightDate).toBe(TODAY)
    // weight, reps, e1rm, volume — one event each on the first ever set
    expect(events.filter((e) => e.exerciseId === 'back-squat')).toHaveLength(4)
  })

  it('attributes each record to the session that actually set it', () => {
    const first = makeSession({
      id: 's1',
      date: daysBefore(10),
      exercises: [makeLog('bench-press', [makeSet(5, 60, 8)])],
    })
    const second = makeSession({
      id: 's2',
      date: daysBefore(3),
      exercises: [makeLog('bench-press', [makeSet(5, 65, 8)])],
    })
    const { records, bySession } = scanPersonalRecords([first, second])

    expect(records['bench-press'].bestWeight).toBe(65)
    expect(records['bench-press'].bestWeightDate).toBe(daysBefore(3))
    expect(bySession['s1']?.some((p) => p.kind === 'weight')).toBe(true)
    expect(bySession['s2']?.some((p) => p.kind === 'weight' && p.value === 65)).toBe(true)
  })

  it('is order-independent — sessions given out of sequence produce the same records', () => {
    const early = makeSession({ date: daysBefore(20), exercises: [makeLog('back-squat', [makeSet(5, 80)])] })
    const late = makeSession({ date: daysBefore(1), exercises: [makeLog('back-squat', [makeSet(5, 120)])] })

    const forward = scanPersonalRecords([early, late])
    const backward = scanPersonalRecords([late, early])

    expect(forward.records['back-squat'].bestWeight).toBe(120)
    expect(backward.records['back-squat'].bestWeight).toBe(120)
    expect(backward.records['back-squat'].bestWeightDate).toBe(daysBefore(1))
  })

  it('breaks a weight tie on reps', () => {
    const session = makeSession({
      exercises: [makeLog('back-squat', [makeSet(3, 100), makeSet(5, 100)])],
    })
    expect(scanPersonalRecords([session]).records['back-squat'].bestWeightReps).toBe(5)
  })

  it('does not award a weight record for a heavier set with fewer reps when equal', () => {
    const session = makeSession({
      exercises: [makeLog('back-squat', [makeSet(5, 100), makeSet(5, 95)])],
    })
    const rec = scanPersonalRecords([session]).records['back-squat']
    expect(rec.bestWeight).toBe(100)
  })

  it('ignores warm-up sets entirely', () => {
    const session = makeSession({
      exercises: [
        makeLog('back-squat', [makeSet(10, 200, 6, { warmup: true }), makeSet(5, 100, 8)]),
      ],
    })
    const rec = scanPersonalRecords([session]).records['back-squat']
    expect(rec.bestWeight).toBe(100)
    expect(rec.totalSets).toBe(1)
  })

  it('ignores incomplete sets', () => {
    const session = makeSession({
      exercises: [makeLog('back-squat', [makeSet(5, 140, 10, { completed: false }), makeSet(5, 100)])],
    })
    expect(scanPersonalRecords([session]).records['back-squat'].bestWeight).toBe(100)
  })

  it('ignores skipped exercises', () => {
    const session = makeSession({
      exercises: [makeLog('back-squat', [makeSet(5, 180)], { skipped: true })],
    })
    expect(scanPersonalRecords([session]).records['back-squat']).toBeUndefined()
  })

  it('tracks timed work by best duration rather than by weight', () => {
    const short = makeSession({ date: daysBefore(5), exercises: [makeLog('plank', [makeSet(45, 0)], { unit: 'seconds' })] })
    const long = makeSession({ date: TODAY, exercises: [makeLog('plank', [makeSet(75, 0)], { unit: 'seconds' })] })
    const rec = scanPersonalRecords([short, long]).records['plank']

    expect(rec.unit).toBe('seconds')
    expect(rec.bestReps).toBe(75)
    expect(rec.bestWeight).toBe(0)
    expect(rec.bestE1rm).toBe(0) // no meaningful 1RM for a plank
  })

  it('tracks distance work in metres', () => {
    const session = makeSession({
      exercises: [makeLog('farmers-carry', [makeSet(40, 32)], { unit: 'metres' })],
    })
    const rec = scanPersonalRecords([session]).records['farmers-carry']
    expect(rec.unit).toBe('metres')
    expect(rec.bestReps).toBe(40)
  })

  it('keeps separate records per exercise', () => {
    const session = makeSession({
      exercises: [
        makeLog('back-squat', [makeSet(5, 100)]),
        makeLog('bench-press', [makeSet(5, 60)]),
      ],
    })
    const records = scanPersonalRecords([session]).records
    expect(Object.keys(records).sort()).toEqual(['back-squat', 'bench-press'])
    expect(records['back-squat'].bestWeight).toBe(100)
    expect(records['bench-press'].bestWeight).toBe(60)
  })

  it('bounds stored history so long logs do not bloat storage', () => {
    const sessions = Array.from({ length: 40 }, (_, i) =>
      makeSession({ date: daysBefore(40 - i), exercises: [makeLog('back-squat', [makeSet(5, 100 + i), makeSet(5, 100 + i)])] }),
    )
    const rec = scanPersonalRecords(sessions).records['back-squat']
    expect(rec.history.length).toBeLessThanOrEqual(60)
    expect(rec.totalSets).toBe(80) // the count is still accurate
    expect(rec.bestWeight).toBe(139)
  })

  it('uses the logged name so a renamed exercise still reads correctly', () => {
    const session = makeSession({
      exercises: [makeLog('back-squat', [makeSet(5, 100)], { name: 'Safety-Bar Squat' })],
    })
    expect(scanPersonalRecords([session]).records['back-squat'].exerciseName).toBe('Safety-Bar Squat')
  })
})

describe('PR aggregation helpers', () => {
  const sessions = [
    makeSession({ date: daysBefore(20), exercises: [makeLog('back-squat', [makeSet(5, 80)])] }),
    makeSession({ date: daysBefore(10), exercises: [makeLog('back-squat', [makeSet(5, 90)]), makeLog('bench-press', [makeSet(5, 55)])] }),
    makeSession({ date: daysBefore(1), exercises: [makeLog('bench-press', [makeSet(5, 62.5)])] }),
  ]

  it('counts exercises that hold a record', () => {
    const records = scanPersonalRecords(sessions).records
    expect(prCount(records)).toBe(2)
  })

  it('counts record-setting events, not exercises', () => {
    // Each session sets weight/reps/e1rm/volume records the first time it beats the mark.
    expect(totalPrEvents(sessions)).toBeGreaterThan(prCount(scanPersonalRecords(sessions).records))
  })

  it('returns the most recent events newest-first', () => {
    const recent = recentPrEvents(sessions, 4)
    expect(recent).toHaveLength(4)
    expect(recent[0].date >= recent[1].date).toBe(true)
  })

  it('ranks top records by recency', () => {
    const top = topRecords(scanPersonalRecords(sessions).records, 5)
    expect(top[0].exerciseId).toBe('bench-press') // improved most recently
  })

  it('handles an empty record set', () => {
    expect(prCount({})).toBe(0)
    expect(topRecords({}, 5)).toEqual([])
    expect(recentPrEvents([], 5)).toEqual([])
  })
})

describe('suggestedWeight', () => {
  it('proposes the smallest increment after an easy top set', () => {
    const sessions = [makeSession({ date: daysBefore(2), exercises: [makeLog('back-squat', [makeSet(5, 100, 8)])] })]
    const suggestion = suggestedWeight(sessions, 'back-squat')
    expect(suggestion?.weight).toBe(102.5)
    expect(suggestion?.reps).toBe(5)
    expect(suggestion?.basis).toBe('last')
  })

  it('proposes a repeat after a grinding set at RPE 9+', () => {
    const sessions = [makeSession({ date: daysBefore(2), exercises: [makeLog('back-squat', [makeSet(5, 100, 9)])] })]
    expect(suggestedWeight(sessions, 'back-squat')?.weight).toBe(100)
  })

  it('assumes RPE 8 when the set was not rated', () => {
    const sessions = [makeSession({ date: daysBefore(2), exercises: [makeLog('back-squat', [makeSet(5, 100)])] })]
    expect(suggestedWeight(sessions, 'back-squat')?.weight).toBe(102.5)
  })

  it('uses the most recent session, not the heaviest ever', () => {
    const sessions = [
      makeSession({ date: daysBefore(20), exercises: [makeLog('back-squat', [makeSet(5, 140, 8)])] }),
      makeSession({ date: daysBefore(1), exercises: [makeLog('back-squat', [makeSet(5, 90, 8)])] }),
    ]
    expect(suggestedWeight(sessions, 'back-squat')?.weight).toBe(92.5)
  })

  it('honours a custom increment', () => {
    const sessions = [makeSession({ exercises: [makeLog('overhead-press', [makeSet(5, 40, 8)])] })]
    expect(suggestedWeight(sessions, 'overhead-press', 1.25)?.weight).toBe(41.25)
  })

  it('returns null when the exercise has never been logged', () => {
    expect(suggestedWeight([], 'back-squat')).toBeNull()
    const sessions = [makeSession({ exercises: [makeLog('bench-press', [makeSet(5, 60)])] })]
    expect(suggestedWeight(sessions, 'back-squat')).toBeNull()
  })

  it('returns null when only bodyweight sets exist', () => {
    const sessions = [makeSession({ exercises: [makeLog('push-up', [makeSet(20, 0)])] })]
    expect(suggestedWeight(sessions, 'push-up')).toBeNull()
  })

  it('ignores skipped exercises', () => {
    const sessions = [makeSession({ exercises: [makeLog('back-squat', [makeSet(5, 100)], { skipped: true })] })]
    expect(suggestedWeight(sessions, 'back-squat')).toBeNull()
  })

  it('never suggests a negative weight after a long layoff', () => {
    const sessions = [makeSession({ date: addDays(TODAY, -200), exercises: [makeLog('back-squat', [makeSet(5, 2.5, 9)])] })]
    expect(suggestedWeight(sessions, 'back-squat')?.weight).toBe(2.5)
  })
})

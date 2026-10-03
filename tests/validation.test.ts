import { describe, expect, it } from 'vitest'
import {
  LIMITS,
  clamp,
  looksLikeExport,
  maxForUnit,
  sanitizeString,
  sanitizeUnit,
  toFiniteNumber,
  validateAppData,
  validateExerciseLog,
  validateGoal,
  validatePreferences,
  validateProfile,
  validateSession,
  validateSet,
} from '../src/lib/validation'
import { defaultAppData } from '../src/lib/storage'
import { TODAY, daysBefore, makeGoal, makeLog, makeSession, makeSet } from './fixtures'

describe('numeric helpers', () => {
  it('clamps to the given range', () => {
    expect(clamp(5, 1, 10)).toBe(5)
    expect(clamp(-5, 1, 10)).toBe(1)
    expect(clamp(50, 1, 10)).toBe(10)
  })

  it('clamps non-finite input to the lower bound', () => {
    expect(clamp(Number.NaN, 1, 10)).toBe(1)
    expect(clamp(Number.POSITIVE_INFINITY, 1, 10)).toBe(1)
  })

  it('coerces junk numbers to the fallback', () => {
    expect(toFiniteNumber('12')).toBe(12)
    expect(toFiniteNumber('abc', 7)).toBe(7)
    expect(toFiniteNumber(null, 3)).toBe(3)
    expect(toFiniteNumber(undefined, 9)).toBe(9)
    expect(toFiniteNumber(Number.NaN, 1)).toBe(1)
  })

  it('truncates over-long strings', () => {
    expect(sanitizeString('x'.repeat(500), 20).length).toBe(20)
    expect(sanitizeString(null, 20)).toBe('')
    // Only real strings are accepted — a stray number in a hand-edited file is
    // dropped rather than silently stringified into a title.
    expect(sanitizeString(42, 20)).toBe('')
  })

  it('falls back to reps for an unknown unit', () => {
    expect(sanitizeUnit('seconds')).toBe('seconds')
    expect(sanitizeUnit('metres')).toBe('metres')
    expect(sanitizeUnit('furlongs')).toBe('reps')
    expect(sanitizeUnit('kg')).toBe('reps')
    expect(sanitizeUnit(undefined)).toBe('reps')
  })

  it('caps each unit at a sane maximum', () => {
    expect(maxForUnit('reps')).toBe(LIMITS.maxReps)
    expect(maxForUnit('seconds')).toBe(LIMITS.maxSeconds)
    expect(maxForUnit('metres')).toBe(LIMITS.maxMetres)
  })
})

describe('validateSet', () => {
  it('accepts a normal strength set', () => {
    const res = validateSet({ id: 's', reps: 5, weight: 100, rpe: 8 })
    expect(res.ok).toBe(true)
    expect(res.value).toMatchObject({ reps: 5, weight: 100, rpe: 8 })
  })

  it('accepts numeric strings from form inputs', () => {
    const res = validateSet({ id: 's', reps: '5', weight: '100.5', rpe: '8' })
    expect(res.ok).toBe(true)
    expect(res.value?.reps).toBe(5)
    expect(res.value?.weight).toBe(100.5)
  })

  it('rejects negative reps and weight', () => {
    expect(validateSet({ id: 's', reps: -5, weight: 100 }).ok).toBe(false)
    expect(validateSet({ id: 's', reps: 5, weight: -100 }).ok).toBe(false)
  })

  it('rejects absurd values', () => {
    expect(validateSet({ id: 's', reps: 100000, weight: 100 }).ok).toBe(false)
    expect(validateSet({ id: 's', reps: 5, weight: 1e9 }).ok).toBe(false)
  })

  it('rejects RPE outside 1-10', () => {
    expect(validateSet({ id: 's', reps: 5, rpe: 0 }).ok).toBe(false)
    expect(validateSet({ id: 's', reps: 5, rpe: 11 }).ok).toBe(false)
    expect(validateSet({ id: 's', reps: 5, rpe: 8.5 }).ok).toBe(true)
  })

  it('treats a missing RPE as unset rather than invalid', () => {
    const res = validateSet({ id: 's', reps: 5 })
    expect(res.ok).toBe(true)
    expect(res.value?.rpe).toBeUndefined()
  })

  it('reads the amount from the reps field whatever the unit is', () => {
    // SetEntry stores seconds and metres in `reps`; the unit says how to read it.
    expect(validateSet({ id: 's', reps: 60 }, 'seconds').value?.reps).toBe(60)
    expect(validateSet({ id: 's', reps: 400 }, 'metres').value?.reps).toBe(400)
    // …and the ceiling for each unit is the one that applies.
    expect(validateSet({ id: 's', reps: 600 }, 'reps').ok).toBe(false)
    expect(validateSet({ id: 's', reps: 600 }, 'seconds').ok).toBe(true)
    expect(validateSet({ id: 's', reps: LIMITS.maxSeconds + 1 }, 'seconds').ok).toBe(false)
    expect(validateSet({ id: 's', reps: LIMITS.maxMetres + 1 }, 'metres').ok).toBe(false)
  })

  it('treats a missing weight as bodyweight rather than an error', () => {
    const res = validateSet({ id: 's', reps: 12 })
    expect(res.ok).toBe(true)
    expect(res.value?.weight).toBe(0)
  })

  it('still rejects a weight that is present but impossible', () => {
    expect(validateSet({ id: 's', reps: 5, weight: 'heavy' }).ok).toBe(false)
    expect(validateSet({ id: 's', reps: 5, weight: -1 }).ok).toBe(false)
  })

  it('requires an amount — a set with nothing recorded is meaningless', () => {
    expect(validateSet({ id: 's' }).ok).toBe(false)
    expect(validateSet({ id: 's', weight: 100 }).ok).toBe(false)
  })

  it('round-trips whole numbers without drift', () => {
    const res = validateSet({ id: 's', reps: 12, weight: 47.5 })
    expect(res.value?.weight).toBe(47.5)
    expect(res.value?.reps).toBe(12)
  })
})

describe('validateExerciseLog', () => {
  it('accepts a log with completed sets', () => {
    const res = validateExerciseLog({ id: 'e', exerciseId: 'back-squat', sets: [makeSet(5, 100)] })
    expect(res.ok).toBe(true)
    expect(res.value?.sets).toHaveLength(1)
  })

  it('accepts a skipped exercise with no sets', () => {
    const res = validateExerciseLog({ id: 'e', exerciseId: 'back-squat', sets: [], skipped: true })
    expect(res.ok).toBe(true)
    expect(res.value?.skipped).toBe(true)
  })

  it('rejects an exercise that neither has sets nor is skipped', () => {
    expect(validateExerciseLog({ id: 'e', exerciseId: 'back-squat', sets: [] }).ok).toBe(false)
  })

  it('rejects an unknown exercise id', () => {
    expect(validateExerciseLog({ id: 'e', exerciseId: 'not-a-real-exercise', sets: [makeSet(5, 100)] }).ok).toBe(false)
  })

  it('caps the number of sets', () => {
    const sets = Array.from({ length: LIMITS.maxSets + 20 }, (_, i) => makeSet(5, 50 + i))
    const res = validateExerciseLog({ id: 'e', exerciseId: 'back-squat', sets })
    expect(res.ok).toBe(true)
    expect(res.value?.sets.length).toBeLessThanOrEqual(LIMITS.maxSets)
  })

  it('drops individually invalid sets but keeps the rest', () => {
    const res = validateExerciseLog({
      id: 'e',
      exerciseId: 'bench-press',
      sets: [makeSet(5, 60), { id: 'bad', reps: -3 }, makeSet(5, 62.5)],
    })
    expect(res.ok).toBe(true)
    expect(res.value?.sets).toHaveLength(2)
  })
})

describe('validateSession', () => {
  it('accepts a real session', () => {
    const res = validateSession(makeSession({ date: TODAY }))
    expect(res.ok).toBe(true)
    expect(res.value?.date).toBe(TODAY)
  })

  it('recovers the date from the timestamps when the date field is corrupt', () => {
    const s = makeSession({ date: TODAY })
    const res = validateSession({ ...s, date: 'garbage' })
    expect(res.ok).toBe(true)
    expect(res.value?.date).toBe(TODAY)
  })

  it('rejects a session with no date anywhere', () => {
    const s = makeSession({ date: TODAY })
    expect(validateSession({ ...s, date: '', startedAt: '', completedAt: '' }).ok).toBe(false)
  })

  it('rejects a malformed date when there is nothing left to recover it from', () => {
    const s = makeSession({ date: TODAY })
    const noTimestamps = { startedAt: '', completedAt: '' }
    expect(validateSession({ ...s, ...noTimestamps, date: '03/10/2026' }).ok).toBe(false)
    expect(validateSession({ ...s, ...noTimestamps, date: 'yesterday' }).ok).toBe(false)
    expect(validateSession({ ...s, ...noTimestamps, date: '2026-13-45' }).ok).toBe(false)
  })

  it('rejects a session dated in the future beyond tolerance', () => {
    const s = makeSession({ date: TODAY })
    expect(validateSession({ ...s, date: '2030-01-01' }).ok).toBe(false)
  })

  it('allows a session dated tomorrow within the timezone tolerance', () => {
    const s = makeSession({ date: TODAY })
    expect(validateSession({ ...s, date: daysBefore(-1) }).ok).toBe(true)
  })

  it('rejects a session with no exercises', () => {
    expect(validateSession({ ...makeSession({ date: TODAY }), exercises: [] }).ok).toBe(false)
  })

  it('requires a title', () => {
    expect(validateSession({ ...makeSession({ date: TODAY }), title: '   ' }).ok).toBe(false)
  })

  it('rejects a negative duration', () => {
    expect(validateSession({ ...makeSession({ date: TODAY }), durationMin: -30 }).ok).toBe(false)
  })

  it('rejects an absurd duration', () => {
    expect(validateSession({ ...makeSession({ date: TODAY }), durationMin: 100000 }).ok).toBe(false)
  })

  it('caps notes length', () => {
    const res = validateSession({ ...makeSession({ date: TODAY }), notes: 'n'.repeat(LIMITS.maxNotes + 500) })
    expect(res.ok).toBe(true)
    expect((res.value?.notes ?? '').length).toBeLessThanOrEqual(LIMITS.maxNotes)
  })

  it('preserves the programme linkage', () => {
    const res = validateSession(makeSession({ date: TODAY, programId: 'beginner-full-body', dayId: 'beg-a' }))
    expect(res.value?.programId).toBe('beginner-full-body')
    expect(res.value?.dayId).toBe('beg-a')
  })

  it('rejects a non-object', () => {
    expect(validateSession(null).ok).toBe(false)
    expect(validateSession(42).ok).toBe(false)
    expect(validateSession('session').ok).toBe(false)
  })

  it('recomputes derived totals so they cannot be forged', () => {
    const res = validateSession({
      ...makeSession({ date: TODAY, exercises: [makeLog('back-squat', [makeSet(5, 100), makeSet(5, 100)])] }),
      volumeKg: 999999,
      completedSets: 9999,
      xp: 1000000,
    })
    expect(res.ok).toBe(true)
    expect(res.value?.volumeKg).toBe(1000)
    expect(res.value?.completedSets).toBe(2)
    expect(res.value?.xp).toBeLessThan(1000)
  })
})

describe('validateGoal', () => {
  it('accepts a well-formed goal', () => {
    const res = validateGoal(makeGoal({ title: 'Bench 80 kg', metric: 'exercise-weight', target: 80 }))
    expect(res.ok).toBe(true)
    expect(res.value?.target).toBe(80)
  })

  it('rejects a goal with no title', () => {
    expect(validateGoal({ ...makeGoal(), title: '' }).ok).toBe(false)
  })

  it('rejects a zero or negative target', () => {
    expect(validateGoal({ ...makeGoal(), target: 0 }).ok).toBe(false)
    expect(validateGoal({ ...makeGoal(), target: -10 }).ok).toBe(false)
  })

  it('rejects an absurd target', () => {
    expect(validateGoal({ ...makeGoal(), target: 1e12 }).ok).toBe(false)
  })

  it('coerces an unknown metric to a safe default rather than failing', () => {
    const res = validateGoal({ ...makeGoal(), metric: 'vibes' })
    expect(res.ok).toBe(true)
    expect(res.value?.metric).toBe('workouts')
  })

  it('treats manual progress as a 0-1 fraction', () => {
    expect(validateGoal({ ...makeGoal(), progressOverride: 0.5 }).value?.progressOverride).toBe(0.5)
    expect(validateGoal({ ...makeGoal(), progressOverride: 500 }).ok).toBe(false)
    expect(validateGoal({ ...makeGoal(), progressOverride: -1 }).ok).toBe(false)
  })

  it('keeps completed goals complete', () => {
    const at = new Date('2026-10-01T10:00:00.000Z').toISOString()
    const res = validateGoal({ ...makeGoal(), completedAt: at })
    expect(res.value?.completedAt).toBe(at)
  })

  it('caps the milestone list', () => {
    const milestones = Array.from({ length: LIMITS.maxMilestones + 10 }, (_, i) => ({ id: `m${i}`, label: `Step ${i}`, done: false }))
    const res = validateGoal({ ...makeGoal(), milestones })
    expect(res.ok).toBe(true)
    expect(res.value?.milestones.length).toBeLessThanOrEqual(LIMITS.maxMilestones)
  })

  it('renames milestones that arrive with no label', () => {
    const res = validateGoal({ ...makeGoal(), milestones: [{ id: 'm1', label: 'Real', done: true }, { id: 'm2', label: '', done: false }] })
    expect(res.value?.milestones).toHaveLength(2)
    expect(res.value?.milestones[1].label.length).toBeGreaterThan(0)
  })

  it('drops milestones that are not objects', () => {
    const res = validateGoal({ ...makeGoal(), milestones: [{ id: 'm1', label: 'Real', done: true }, null, 7, 'junk'] })
    expect(res.value?.milestones).toHaveLength(1)
  })
})

describe('validateProfile and validatePreferences', () => {
  it('accepts a plausible profile', () => {
    const res = validateProfile({ displayName: 'Nani', bodyweightKg: 78.4, heightCm: 175, units: 'kg' })
    expect(res.ok).toBe(true)
    expect(res.value?.displayName).toBe('Nani')
  })

  it('rejects a negative bodyweight', () => {
    const res = validateProfile({ displayName: 'A', bodyweightKg: -70 })
    expect(res.ok).toBe(false)
  })

  it('rejects an implausible bodyweight', () => {
    expect(validateProfile({ displayName: 'A', bodyweightKg: 5000 }).ok).toBe(false)
  })

  it('rejects an implausible height', () => {
    expect(validateProfile({ displayName: 'A', heightCm: 900 }).ok).toBe(false)
  })

  it('falls back to a default display name when blank', () => {
    const res = validateProfile({ displayName: '   ' })
    expect(res.ok).toBe(true)
    expect(res.value?.displayName.length).toBeGreaterThan(0)
  })

  it('accepts known preferences and rejects unknown themes', () => {
    expect(validatePreferences({ theme: 'frost', defaultRestSec: 120, weekStartsOn: 0 }).ok).toBe(true)
    const res = validatePreferences({ theme: 'does-not-exist', defaultRestSec: -1, weekStartsOn: 9 })
    expect(res.ok).toBe(true) // coerced, not fatal
    expect(res.value?.theme).toBe('ember')
    expect(res.value?.defaultRestSec).toBe(90) // a broken value falls back, never 0
    expect([0, 1]).toContain(res.value?.weekStartsOn)
    expect(validatePreferences({ defaultRestSec: 3 }).value?.defaultRestSec).toBe(5) // floored
    expect(validatePreferences({ defaultRestSec: 99999 }).value?.defaultRestSec).toBe(1800)
    expect(validatePreferences({ defaultRestSec: 'abc' }).value?.defaultRestSec).toBe(90)
  })
})

describe('validateAppData', () => {
  it('accepts the default document', () => {
    const res = validateAppData(defaultAppData())
    expect(res.ok).toBe(true)
    expect(res.issues).toEqual([])
  })

  it('accepts real content', () => {
    const res = validateAppData({
      ...defaultAppData(),
      sessions: [makeSession({ date: TODAY }), makeSession({ date: daysBefore(2) })],
      goals: [makeGoal({ title: 'Squat 140 kg' })],
    })
    expect(res.ok).toBe(true)
    expect(res.sessions).toHaveLength(2)
  })

  it('reports problems without throwing', () => {
    let res: ReturnType<typeof validateAppData>
    expect(() => {
      res = validateAppData({ sessions: [null, 'junk'], goals: 42, profile: 'nope' })
    }).not.toThrow()
    expect(res!.sessions).toEqual([])
    expect(res!.goals).toEqual([])
  })

  it('rejects a non-object entirely', () => {
    expect(validateAppData(null).ok).toBe(false)
    expect(validateAppData('data').ok).toBe(false)
    expect(validateAppData(7).ok).toBe(false)
  })

  it('keeps the document usable even when half of it is corrupt', () => {
    const res = validateAppData({
      ...defaultAppData(),
      sessions: [makeSession({ date: TODAY }), { broken: true }],
      goals: [makeGoal({ title: 'Fine' }), { broken: true }],
    })
    expect(res.sessions).toHaveLength(1)
    expect(res.goals).toHaveLength(1)
    expect(res.issues.length).toBeGreaterThan(0)
  })
})

describe('looksLikeExport', () => {
  it('recognises a Forge export', () => {
    expect(looksLikeExport({ app: 'forge-workout', version: 1, sessions: [], goals: [] })).toBe(true)
  })

  it('is strict — only a genuine Forge export is recognised', () => {
    // Bare bundles are still *importable* (parseImport accepts them), they are
    // just not identifiable as a Forge file.
    expect(looksLikeExport({ sessions: [] })).toBe(false)
    expect(looksLikeExport({ app: 'forge-workout', sessions: [] })).toBe(false)
    expect(looksLikeExport({ app: 'forge-workout', version: 1, sessions: [] })).toBe(true)
  })

  it('rejects unrelated data', () => {
    expect(looksLikeExport({ foo: 'bar' })).toBe(false)
    expect(looksLikeExport(null)).toBe(false)
    expect(looksLikeExport(42)).toBe(false)
  })
})

import type { ExerciseLog, Goal, SetEntry, SetUnit, WorkoutSession } from '../src/types'
import { exerciseName, getExercise } from '../src/data/exercises'
import { withComputedTotals } from '../src/lib/xp'
import { addDays } from '../src/lib/dates'
import { uid } from '../src/lib/id'

/**
 * Test fixtures.
 *
 * All dates are fixed rather than relative to the real clock, so the suite gives
 * the same answer on any day it is run.
 */

/** A Saturday, matching the repository's seeded monthly log. */
export const TODAY = '2026-10-03'

export function daysBefore(n: number, from = TODAY): string {
  return addDays(from, -n)
}

export function daysAfter(n: number, from = TODAY): string {
  return addDays(from, n)
}

/** Local-time ISO timestamp on a date key. */
export function isoAt(date: string, hour = 18, minute = 0): string {
  const h = String(Math.max(0, Math.min(23, hour))).padStart(2, '0')
  const m = String(Math.max(0, Math.min(59, minute))).padStart(2, '0')
  return new Date(`${date}T${h}:${m}:00`).toISOString()
}

export function makeSet(reps: number, weight: number, rpe?: number, extra: Partial<SetEntry> = {}): SetEntry {
  return {
    id: extra.id ?? uid('set'),
    reps,
    weight,
    rpe,
    completed: extra.completed ?? true,
    warmup: extra.warmup ?? false,
  }
}

export interface LogOptions {
  unit?: SetUnit
  name?: string
  target?: string
  rpeTarget?: string
  skipped?: boolean
  note?: string
}

export function makeLog(exerciseId: string, sets: SetEntry[], opts: LogOptions = {}): ExerciseLog {
  return {
    exerciseId,
    name: opts.name ?? exerciseName(exerciseId),
    unit: opts.unit ?? getExercise(exerciseId)?.unit ?? 'reps',
    sets,
    target: opts.target,
    rpeTarget: opts.rpeTarget,
    skipped: opts.skipped ?? false,
    note: opts.note,
  }
}

export interface SessionOptions {
  id?: string
  date?: string
  hour?: number
  title?: string
  exercises?: ExerciseLog[]
  durationMin?: number
  programId?: string
  dayId?: string
  notes?: string
  deload?: boolean
  mood?: 1 | 2 | 3 | 4 | 5
  energy?: 1 | 2 | 3 | 4 | 5
  sleepHours?: number
  bodyweightKg?: number
  origin?: WorkoutSession['origin']
}

/** Builds a session with totals already computed, exactly as the store would. */
export function makeSession(opts: SessionOptions = {}): WorkoutSession {
  const date = opts.date ?? TODAY
  const startedAt = isoAt(date, opts.hour ?? 18, 0)
  const durationMin = opts.durationMin ?? 60
  const completedAt = isoAt(
    date,
    Math.min(23, (opts.hour ?? 18) + Math.floor(durationMin / 60)),
    durationMin % 60,
  )

  return withComputedTotals({
    id: opts.id ?? uid('sess'),
    startedAt,
    completedAt,
    date,
    title: opts.title ?? 'Test workout',
    programId: opts.programId,
    dayId: opts.dayId,
    exercises: opts.exercises ?? [makeLog('back-squat', [makeSet(5, 100, 8), makeSet(5, 100, 8), makeSet(5, 100, 8)])],
    durationMin,
    notes: opts.notes,
    mood: opts.mood,
    energy: opts.energy,
    sleepHours: opts.sleepHours,
    bodyweightKg: opts.bodyweightKg,
    deload: opts.deload ?? false,
    xp: 0,
    xpBreakdown: [],
    volumeKg: 0,
    completedSets: 0,
    prs: [],
    origin: opts.origin ?? 'live',
  })
}

export function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: overrides.id ?? uid('goal'),
    title: overrides.title ?? 'Squat 120 kg for 5',
    category: overrides.category ?? 'strength',
    metric: overrides.metric ?? 'exercise-weight',
    exerciseId: overrides.exerciseId ?? 'back-squat',
    target: overrides.target ?? 120,
    unit: overrides.unit ?? 'kg',
    direction: overrides.direction ?? 'increase',
    createdAt: overrides.createdAt ?? isoAt(TODAY, 9),
    milestones: overrides.milestones ?? [],
    ...overrides,
  }
}

/** A realistic three-exercise full-body session, used by several suites. */
export function fullBodySession(date: string, opts: SessionOptions = {}): WorkoutSession {
  return makeSession({
    date,
    title: 'Workout A',
    programId: 'beginner-full-body',
    dayId: 'beg-a',
    durationMin: 58,
    exercises: [
      makeLog('back-squat', [makeSet(5, 100, 8), makeSet(5, 100, 8), makeSet(5, 100, 8.5)]),
      makeLog('bench-press', [makeSet(5, 60, 8), makeSet(5, 60, 8), makeSet(5, 60, 9)]),
      makeLog('barbell-row', [makeSet(8, 50, 8), makeSet(8, 50, 8), makeSet(8, 50, 8)]),
    ],
    ...opts,
  })
}

/** Seven consecutive training days ending on `endDate`. */
export function consecutiveSessions(endDate: string, count = 7): WorkoutSession[] {
  return Array.from({ length: count }, (_, i) =>
    makeSession({ date: addDays(endDate, -(count - 1 - i)), title: `Day ${i + 1}` }),
  )
}

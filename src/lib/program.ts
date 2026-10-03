import type { BlockOverride, Program, ProgramBlock, ProgramDay, ProgramExercise } from '../types'
import { PROGRAM_MAP, getProgram } from '../data/programs'
import { EXERCISE_MAP } from '../data/exercises'
import { tierOf } from './xp'
import { diffDays, startOfWeek } from './dates'

/**
 * Programme maths.
 *
 * The written plans in `programs/*.md` change their set/rep scheme week by week
 * — block 2 of the beginner programme adds a fourth set, week 5 halves them and
 * drops the load 20%. `resolveDayForWeek` applies those documented adjustments so
 * that starting a workout in week 6 gives you week 6's numbers.
 */

export interface ResolvedDay {
  program: Program
  day: ProgramDay
  week: number
  block?: ProgramBlock
  deload: boolean
  /** Multiplier to apply to the user's usual working weight (0.8 in a deload). */
  loadFactor: number
  exercises: ProgramExercise[]
  estimatedMin: number
}

export function blockForWeek(program: Program, week: number): ProgramBlock | undefined {
  return program.blocks.find((b) => b.weeks.includes(week))
}

/** Clamp a week number into the programme's cycle, so week 13 of an 8-week cycle is week 5. */
export function cycleWeek(program: Program, week: number): number {
  if (!Number.isFinite(week) || week < 1) return 1
  const total = Math.max(1, program.totalWeeks)
  return ((week - 1) % total) + 1
}

function applyOverride(
  pe: ProgramExercise,
  index: number,
  overrides: readonly BlockOverride[],
): { exercise: ProgramExercise; loadFactor: number } {
  let next: ProgramExercise = { ...pe }
  let loadFactor = 1

  for (const o of overrides) {
    if (o.tier && tierOf(pe.exerciseId) !== o.tier) continue
    if (o.positions && !o.positions.includes(index)) continue

    if (typeof o.sets === 'number' && Number.isFinite(o.sets)) {
      next = { ...next, sets: Math.max(1, Math.round(o.sets)) }
    }
    if (typeof o.setDelta === 'number' && Number.isFinite(o.setDelta)) {
      next = { ...next, sets: Math.max(1, next.sets + Math.round(o.setDelta)) }
    }
    if (typeof o.repsMin === 'number' && Number.isFinite(o.repsMin)) {
      next = { ...next, repsMin: Math.max(1, Math.round(o.repsMin)) }
    }
    if (typeof o.repsMax === 'number' && Number.isFinite(o.repsMax)) {
      next = { ...next, repsMax: Math.max(next.repsMin, Math.round(o.repsMax)) }
    }
    if (typeof o.target === 'string' && o.target.trim()) {
      next = { ...next, target: o.target }
    }
    if (typeof o.rpe === 'string' && o.rpe.trim()) {
      next = { ...next, rpe: o.rpe }
    }
    if (typeof o.loadFactor === 'number' && Number.isFinite(o.loadFactor) && o.loadFactor > 0) {
      loadFactor = Math.min(loadFactor, o.loadFactor)
    }
  }

  // Keep the human-readable target in sync when reps were rewritten numerically.
  if (next.target === pe.target && (next.repsMin !== pe.repsMin || next.repsMax !== pe.repsMax)) {
    const suffix = pe.unit === 'seconds' ? ' s' : pe.unit === 'metres' ? ' m' : ''
    const perSide = pe.perSide ? ' per side' : ''
    next = {
      ...next,
      target:
        next.repsMin === next.repsMax
          ? `${next.repsMin}${suffix}${perSide}`
          : `${next.repsMin}–${next.repsMax}${suffix}${perSide}`,
    }
  }

  return { exercise: next, loadFactor }
}

/**
 * Resolve a programme day for a specific week, with the block's adjustments
 * applied. `week` is 1-based within the programme and cycles automatically.
 */
export function resolveDayForWeek(programId: string, dayId: string, week: number): ResolvedDay | undefined {
  const program = getProgram(programId)
  if (!program) return undefined
  const day = program.days.find((d) => d.id === dayId)
  if (!day) return undefined

  const cyclicWeek = cycleWeek(program, week)
  const block = blockForWeek(program, cyclicWeek)
  const overrides = block?.overrides ?? []

  let loadFactor = 1
  const exercises = day.exercises.map((pe, i) => {
    const { exercise, loadFactor: lf } = applyOverride(pe, i, overrides)
    loadFactor = Math.min(loadFactor, lf)
    return exercise
  })

  return {
    program,
    day,
    week: cyclicWeek,
    block,
    deload: block?.deload === true,
    loadFactor,
    exercises,
    estimatedMin: estimateSessionMinutes(day, exercises),
  }
}

/** Rough session length from set counts, per-set work time and prescribed rests. */
export function estimateSessionMinutes(day: ProgramDay, exercises: ProgramExercise[] = day.exercises): number {
  let seconds = 0
  for (const pe of exercises) {
    const meta = EXERCISE_MAP[pe.exerciseId]
    // Per-side work is not slower per set — both sides happen inside the set.
    seconds += ((meta?.estSetSeconds ?? 30) + pe.restSec) * pe.sets
  }
  // Warm-up, ramp-up sets and cooldown, per reference/warmup-and-cooldown.md.
  seconds += 6 * 60
  return Math.max(10, Math.round(seconds / 60))
}

/**
 * 1-based programme week for a date, given the date of the user's first session
 * on that programme. Weeks run Monday-first by default.
 */
export function programmeWeek(programStartKey: string, dateKey: string, weekStartsOn: 0 | 1 = 1): number {
  const start = startOfWeek(programStartKey, weekStartsOn)
  const current = startOfWeek(dateKey, weekStartsOn)
  const days = diffDays(start, current)
  if (days < 0) return 1
  return Math.floor(days / 7) + 1
}

/** Which day of the programme's rotation falls next, given how many sessions are done. */
export function nextRotationDay(program: Program, sessionsCompleted: number): ProgramDay {
  if (program.days.length === 0) {
    throw new Error(`Programme ${program.id} has no days`)
  }
  return program.days[sessionsCompleted % program.days.length]
}

/** The day scheduled for a given weekday, if the programme trains that day. */
export function dayForWeekday(program: Program, weekdayIndex: number): ProgramDay | undefined {
  const slot = program.schedule.find((s) => s.dayIndex === weekdayIndex && s.dayId)
  if (!slot?.dayId) return undefined
  return program.days.find((d) => d.id === slot.dayId)
}

/** "Block 2 · Week 3 of 12" — the label shown on the dashboard and session header. */
export function weekLabel(program: Program, week: number): string {
  const cyclic = cycleWeek(program, week)
  const block = blockForWeek(program, cyclic)
  const cycle = Math.floor((week - 1) / Math.max(1, program.totalWeeks)) + 1
  const cycleSuffix = program.totalWeeks < 12 && cycle > 1 ? ` · cycle ${cycle}` : ''
  return block ? `${block.label.split(' · ')[0]} · week ${cyclic} of ${program.totalWeeks}${cycleSuffix}` : `Week ${cyclic}${cycleSuffix}`
}

export function daysPerWeekFor(programId?: string): number {
  if (!programId) return 0
  return PROGRAM_MAP[programId]?.daysPerWeek ?? 0
}

/** Total sets prescribed across a whole programme week — used for planning views. */
export function weeklySetVolume(program: Program): number {
  return program.days.reduce((n, d) => n + d.exercises.reduce((m, e) => m + e.sets, 0), 0)
}

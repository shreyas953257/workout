import type { ExerciseLog, SetEntry, WorkoutSession, XpAward } from '../types'
import { EXERCISE_MAP } from '../data/exercises'
import {
  DELOAD_FACTOR,
  EXERCISE_BONUS_CAP,
  EXERCISE_COMPLETE_XP,
  SET_XP,
  VOLUME_XP_CAP,
  VOLUME_XP_PER_KG,
  WORKOUT_COMPLETE_XP,
  roundXp,
  rpeMultiplier,
} from '../data/xp'

/**
 * XP awarded for *doing the work*.
 *
 * This module only prices what is already in a session record: completed sets,
 * the tier of the exercise, the RPE recorded on the set, the session finishing,
 * and the external volume moved. PR, streak, achievement and goal XP are added
 * by the replay engine in `progress.ts` because they depend on history.
 */

/** Sets that count: completed, and not a ramp-up set. */
export function countingSets(log: ExerciseLog): SetEntry[] {
  return log.sets.filter((s) => s.completed && !s.warmup)
}

/** External volume in the profile's unit: Σ(weight × reps) over counting rep-sets. */
export function volumeKg(log: ExerciseLog): number {
  if (log.unit !== 'reps') return 0
  return countingSets(log).reduce((total, s) => total + s.weight * s.reps, 0)
}

/** Skipped exercises contribute nothing — not to XP, volume or set count. */
export function activeLogs(session: WorkoutSession): ExerciseLog[] {
  return session.exercises.filter((e) => !e.skipped)
}

export function sessionVolumeKg(session: WorkoutSession): number {
  return Math.round(activeLogs(session).reduce((t, e) => t + volumeKg(e), 0) * 10) / 10
}

export function sessionCompletedSets(session: WorkoutSession): number {
  return activeLogs(session).reduce((t, e) => t + countingSets(e).length, 0)
}

/** Tier for an exercise id, defaulting to 'accessory' for custom/unlisted entries. */
export function tierOf(exerciseId: string): keyof typeof SET_XP {
  return EXERCISE_MAP[exerciseId]?.tier ?? 'accessory'
}

/** XP for a single completed set. Warm-up and incomplete sets earn nothing. */
export function setXp(set: SetEntry, exerciseId: string, deload = false): number {
  if (!set.completed || set.warmup) return 0
  const base = SET_XP[tierOf(exerciseId)] ?? SET_XP.accessory
  const factored = base * rpeMultiplier(set.rpe) * (deload ? DELOAD_FACTOR : 1)
  return roundXp(factored)
}

export interface SessionXp {
  total: number
  breakdown: XpAward[]
  volumeKg: number
  completedSets: number
  completedExercises: number
}

/**
 * Base XP for a finished session — sets, per-exercise bonus, completion and
 * volume. Deterministic: the same session always produces the same number.
 */
export function sessionBaseXp(session: WorkoutSession): SessionXp {
  const breakdown: XpAward[] = []
  const deload = session.deload === true

  let setTotal = 0
  let completedSets = 0
  let completedExercises = 0

  for (const log of session.exercises) {
    const sets = countingSets(log)
    if (sets.length === 0 || log.skipped) continue
    completedExercises++
    completedSets += sets.length
    for (const set of sets) setTotal += setXp(set, log.exerciseId, deload)
  }

  if (completedSets > 0) {
    breakdown.push({
      kind: 'set',
      label: `${completedSets} set${completedSets === 1 ? '' : 's'} completed`,
      amount: setTotal,
    })
  }

  const exerciseBonus = Math.min(completedExercises * EXERCISE_COMPLETE_XP, EXERCISE_BONUS_CAP)
  if (exerciseBonus > 0) {
    breakdown.push({
      kind: 'workout',
      label: `${completedExercises} exercise${completedExercises === 1 ? '' : 's'} finished`,
      amount: roundXp(exerciseBonus * (deload ? DELOAD_FACTOR : 1)),
    })
  }

  const vol = sessionVolumeKg(session)
  // Volume XP rewards moving real load; bodyweight-only sessions score 0 here,
  // which is honest rather than inflating the number with assumed bodyweight.
  const volumeXp = Math.min(Math.floor(vol / VOLUME_XP_PER_KG), VOLUME_XP_CAP)
  if (volumeXp > 0) {
    breakdown.push({ kind: 'volume', label: `${Math.round(vol).toLocaleString('en-US')} kg moved`, amount: volumeXp })
  }

  // Finishing at all is worth something, but only if there was real work in it.
  const finishXp = completedSets > 0 ? roundXp(WORKOUT_COMPLETE_XP * (deload ? DELOAD_FACTOR : 1)) : 0
  if (finishXp > 0) {
    breakdown.push({ kind: 'workout', label: deload ? 'Deload session completed' : 'Workout completed', amount: finishXp })
  }

  const total = breakdown.reduce((n, a) => n + a.amount, 0)
  return { total, breakdown, volumeKg: vol, completedSets, completedExercises }
}

/**
 * Re-prices a session and returns it with frozen xp/volume/set totals.
 * Used when finishing a live session and when importing records that arrived
 * without trustworthy totals.
 */
export function withComputedTotals(session: WorkoutSession): WorkoutSession {
  const base = sessionBaseXp(session)
  return {
    ...session,
    volumeKg: base.volumeKg,
    completedSets: base.completedSets,
    // xp is topped up by the replay engine with PR/streak/achievement awards;
    // store the base so history has a stable, explainable floor.
    xp: base.total,
    xpBreakdown: base.breakdown,
  }
}

/** XP that a session *would* award, for the pre-session estimate on the dashboard. */
export function estimateSessionXp(exerciseIds: string[], setsPerExercise: number, deload = false): number {
  let total = 0
  let count = 0
  for (const id of exerciseIds) {
    const per = SET_XP[tierOf(id)] ?? SET_XP.accessory
    total += per * setsPerExercise
    count++
  }
  total += Math.min(count * EXERCISE_COMPLETE_XP, EXERCISE_BONUS_CAP) + WORKOUT_COMPLETE_XP
  return roundXp(total * (deload ? DELOAD_FACTOR : 1))
}

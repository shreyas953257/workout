import type { XpKind } from '../types'

/**
 * XP economy.
 *
 * Every number here is a fixed constant applied to something the user actually
 * did. Nothing is randomised, and no XP is ever granted without a logged set,
 * session, PR, streak day, achievement or completed goal behind it.
 *
 * A realistic session lands around 150–260 XP, which puts level 2 after the
 * first workout and level 10 after roughly 25–30 sessions — fast enough to feel
 * responsive early, slow enough that later levels mean something.
 */

/** Base XP per completed set, by exercise tier. */
export const SET_XP: Record<string, number> = {
  compound: 12,
  accessory: 9,
  isolation: 7,
  core: 6,
  conditioning: 8,
}

/** Multiplier applied to set XP by the RPE recorded on that set. */
export const RPE_MULTIPLIER: Record<number, number> = {
  5: 0.7,
  6: 0.8,
  7: 0.9,
  8: 1.0,
  9: 1.1,
  10: 1.2,
}

/** Multiplier for half-RPE values. */
export const RPE_MULTIPLIER_HALF: Record<number, number> = {
  7.5: 0.95,
  8.5: 1.05,
  9.5: 1.15,
}

export function rpeMultiplier(rpe?: number): number {
  if (rpe == null || !Number.isFinite(rpe)) return 1
  const clamped = Math.max(5, Math.min(10, rpe))
  if (RPE_MULTIPLIER[clamped] != null) return RPE_MULTIPLIER[clamped]
  return RPE_MULTIPLIER_HALF[clamped] ?? 1
}

/** Flat XP for finishing a session at all. */
export const WORKOUT_COMPLETE_XP = 40

/** Per exercise actually completed (not skipped) inside a session. */
export const EXERCISE_COMPLETE_XP = 6

/** Cap on per-exercise bonus so long sessions do not dominate. */
export const EXERCISE_BONUS_CAP = 48

/** 1 XP per this many kg of total volume moved, capped per session. */
export const VOLUME_XP_PER_KG = 100
export const VOLUME_XP_CAP = 100

/** Deload sessions are worth less — deliberately, so a deload is not farmed. */
export const DELOAD_FACTOR = 0.6

/** Skipped exercises earn nothing but do not penalise the session. */
export const SKIPPED_PENALTY = 0

/** New personal record, by kind. */
export const PR_XP: Record<'weight' | 'reps' | 'e1rm' | 'volume', number> = {
  e1rm: 50,
  weight: 35,
  reps: 30,
  volume: 20,
}

/** Cap on PR XP in one session, so a beginner's first month does not explode. */
export const PR_XP_SESSION_CAP = 150

/**
 * Streak bonuses — awarded once, on the session that reaches that day count.
 * Deliberately front-loaded: the first week is the hardest habit to build.
 */
export const STREAK_BONUS: Record<number, number> = {
  3: 15,
  7: 40,
  14: 60,
  21: 80,
  30: 150,
  45: 180,
  60: 220,
  90: 320,
  100: 400,
  180: 700,
  365: 1500,
}

export const STREAK_MILESTONES = Object.keys(STREAK_BONUS)
  .map(Number)
  .sort((a, b) => a - b)

/** XP for completing a goal, and for each milestone ticked inside it. */
export const GOAL_XP = 100
export const GOAL_MILESTONE_XP = 25

/** Kind labels, for the XP history feed. */
export const XP_KIND_LABEL: Record<XpKind, string> = {
  set: 'Sets completed',
  workout: 'Workout finished',
  volume: 'Volume moved',
  pr: 'Personal record',
  streak: 'Streak milestone',
  achievement: 'Achievement',
  goal: 'Goal completed',
  'goal-milestone': 'Goal milestone',
}

/** Every XP amount is rounded to a whole number by this, so totals are stable. */
export function roundXp(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n)
}

import type { UnlockCondition, UnlockDef } from '../types'
import { UNLOCKS, UNLOCK_MAP } from '../data/unlocks'
import type { ProgressStats } from './stats'

/**
 * Unlock evaluation.
 *
 * Same contract as achievements: pure, deterministic, and driven only by real
 * progress. `any` conditions unlock on the first branch satisfied, and the
 * reason string records which branch actually fired so the Unlock History panel
 * can say *why* something opened.
 */

export interface UnlockEvaluation {
  met: boolean
  progress: number
  target: number
  /** Which branch satisfied an `any` condition. */
  metBy?: string
}

function label(condition: UnlockCondition): string {
  switch (condition.type) {
    case 'level':
      return `level ${condition.level}`
    case 'workouts':
      return `${condition.count} workouts`
    case 'streak':
      return `a ${condition.days}-day streak`
    case 'xp':
      return `${condition.amount.toLocaleString('en-US')} XP`
    case 'achievements':
      return `${condition.count} achievements`
    case 'volume':
      return `${condition.kg.toLocaleString('en-US')} kg moved`
    case 'any':
      return condition.of.map(label).join(' or ')
    default:
      return 'progress'
  }
}

function evaluateOne(condition: UnlockCondition, stats: ProgressStats, achievementsUnlocked: number): UnlockEvaluation {
  switch (condition.type) {
    case 'level':
      return { met: stats.level >= condition.level, progress: stats.level, target: condition.level }
    case 'workouts':
      return { met: stats.workouts >= condition.count, progress: stats.workouts, target: condition.count }
    case 'streak': {
      const best = Math.max(stats.streak, stats.longestStreak)
      return { met: best >= condition.days, progress: best, target: condition.days }
    }
    case 'xp':
      return { met: stats.xp >= condition.amount, progress: stats.xp, target: condition.amount }
    case 'achievements':
      return { met: achievementsUnlocked >= condition.count, progress: achievementsUnlocked, target: condition.count }
    case 'volume':
      return { met: stats.volumeKg >= condition.kg, progress: Math.floor(stats.volumeKg), target: condition.kg }
    case 'any': {
      const results = condition.of.map((c) => evaluateOne(c, stats, achievementsUnlocked))
      const hit = results.find((r) => r.met)
      const closest = results.reduce((a, b) =>
        a.target > 0 && b.target > 0 && a.progress / a.target >= b.progress / b.target ? a : b,
      )
      return hit
        ? { met: true, progress: hit.progress, target: hit.target, metBy: label(condition.of[results.indexOf(hit)]) }
        : { met: false, progress: closest.progress, target: closest.target }
    }
    default:
      return { met: false, progress: 0, target: 1 }
  }
}

export function evaluateUnlock(unlock: UnlockDef, stats: ProgressStats, achievementsUnlocked = 0): UnlockEvaluation {
  return evaluateOne(unlock.condition, stats, achievementsUnlocked)
}

export function evaluateAllUnlocks(
  stats: ProgressStats,
  achievementsUnlocked = 0,
): Record<string, UnlockEvaluation> {
  const out: Record<string, UnlockEvaluation> = {}
  for (const u of UNLOCKS) out[u.id] = evaluateUnlock(u, stats, achievementsUnlocked)
  return out
}

export function unlockRequirementText(unlock: UnlockDef): string {
  return unlock.requirement || `Reach ${label(unlock.condition)}`
}

export function unlockProgressPct(evaluation: UnlockEvaluation): number {
  if (evaluation.target <= 0) return evaluation.met ? 1 : 0
  return Math.max(0, Math.min(1, evaluation.progress / evaluation.target))
}

export { UNLOCKS, UNLOCK_MAP, label as conditionLabel }

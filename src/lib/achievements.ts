import type { Achievement, AchievementCondition, AchievementState } from '../types'
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, TOTAL_ACHIEVEMENT_XP } from '../data/achievements'
import type { ProgressStats } from './stats'

/**
 * Achievement evaluation.
 *
 * Pure functions over `ProgressStats`. Given the same log, the same set of
 * achievements is always satisfied — there is no randomness, no time-gating and
 * no way to earn one without the underlying activity existing in the data.
 */

export interface Evaluation {
  met: boolean
  progress: number
  target: number
}

const DEFAULT_BW_REPS = 5

export function evaluateCondition(condition: AchievementCondition, stats: ProgressStats): Evaluation {
  switch (condition.type) {
    case 'workouts':
      return ev(stats.workouts, condition.count)
    case 'sets':
      return ev(stats.sets, condition.count)
    case 'streak':
      return ev(Math.max(stats.streak, stats.longestStreak), condition.days)
    case 'longestStreak':
      return ev(stats.longestStreak, condition.days)
    case 'prs':
      return ev(stats.prEvents, condition.count)
    case 'level':
      return ev(stats.level, condition.level)
    case 'xp':
      return ev(stats.xp, condition.amount)
    case 'volume':
      return ev(Math.floor(stats.volumeKg), condition.kg)
    case 'duration':
      return ev(Math.round(stats.durationMin), condition.minutes)
    case 'distinctExercises':
      return ev(stats.distinctExercises, condition.count)
    case 'goalsCompleted':
      return ev(stats.goalsCompleted, condition.count)
    case 'sessionsWithNotes':
      return ev(stats.sessionsWithNotes, condition.count)
    case 'deloadSessions':
      return ev(stats.deloadSessions, condition.count)
    case 'programmeBlocks':
      return ev(stats.programmeBlocks, condition.count)
    case 'perfectWeeks':
      return ev(stats.perfectWeeks, condition.count)
    case 'weekendSessions':
      return ev(stats.weekendSessions, condition.count)
    case 'earlySessions':
      return ev(stats.earlySessions, condition.count)
    case 'lateSessions':
      return ev(stats.lateSessions, condition.count)

    case 'longSessions': {
      const count = stats.sessions.filter((s) => (s.durationMin || 0) >= condition.minutes).length
      return ev(count, condition.count)
    }

    case 'bodyweightMultiple': {
      const bw = stats.bodyweightKg
      if (!bw || bw <= 0) {
        // Without a recorded bodyweight this cannot be judged. Report 0 rather
        // than granting or permanently blocking it.
        return { met: false, progress: 0, target: condition.multiple }
      }
      const requiredReps = condition.reps ?? DEFAULT_BW_REPS
      const needed = bw * condition.multiple
      let best = 0
      for (const session of stats.sessions) {
        for (const log of session.exercises) {
          if (log.exerciseId !== condition.exerciseId || log.skipped) continue
          for (const set of log.sets) {
            if (!set.completed || set.warmup || set.reps < requiredReps) continue
            if (set.weight > best) best = set.weight
          }
        }
      }
      const achievedMultiple = best / bw
      return {
        met: best >= needed - 1e-9,
        progress: Math.round(achievedMultiple * 100) / 100,
        target: condition.multiple,
      }
    }

    default: {
      // Unknown condition type (e.g. data from a newer export): fail closed
      // rather than granting an achievement we cannot verify.
      return { met: false, progress: 0, target: 1 }
    }
  }
}

function ev(progress: number, target: number): Evaluation {
  const p = Number.isFinite(progress) ? progress : 0
  const t = Number.isFinite(target) ? target : 1
  return { met: p >= t, progress: p, target: t }
}

export function evaluateAchievement(achievement: Achievement, stats: ProgressStats): Evaluation {
  return evaluateCondition(achievement.condition, stats)
}

/**
 * Evaluate every achievement against a stats snapshot.
 * `alreadyUnlocked` keeps previously earned achievements earned even if a
 * condition becomes unverifiable later (for instance bodyweight being cleared).
 */
export function evaluateAll(
  stats: ProgressStats,
  alreadyUnlocked: ReadonlySet<string> = new Set(),
): Record<string, Evaluation> {
  const out: Record<string, Evaluation> = {}
  for (const a of ACHIEVEMENTS) {
    const e = evaluateAchievement(a, stats)
    out[a.id] = alreadyUnlocked.has(a.id) ? { ...e, met: true } : e
  }
  return out
}

export function achievementState(
  achievement: Achievement,
  evaluation: Evaluation,
  unlockedAt?: string,
  reason?: string,
): AchievementState {
  const target = evaluation.target || 1
  return {
    id: achievement.id,
    unlocked: evaluation.met,
    unlockedAt,
    reason,
    progress: Math.min(evaluation.progress, target),
    target,
  }
}

/** Fraction 0–1 for a progress bar, safe against a zero target. */
export function achievementPct(evaluation: Evaluation): number {
  if (evaluation.target <= 0) return evaluation.met ? 1 : 0
  return Math.max(0, Math.min(1, evaluation.progress / evaluation.target))
}

export function describeProgress(achievement: Achievement, evaluation: Evaluation): string {
  const a = achievement
  const p = evaluation.progress
  const t = evaluation.target
  if (a.condition.type === 'bodyweightMultiple') {
    return `${p.toFixed(2)} × / ${t.toFixed(2)} × bodyweight`
  }
  if (a.condition.type === 'volume') {
    return `${Math.round(p).toLocaleString('en-US')} / ${Math.round(t).toLocaleString('en-US')} kg`
  }
  if (a.condition.type === 'duration') {
    const h = (n: number) => `${Math.round(n / 60)} h`
    return `${h(p)} / ${h(t)}`
  }
  return `${Math.round(p).toLocaleString('en-US')} / ${Math.round(t).toLocaleString('en-US')}`
}

export { ACHIEVEMENTS, ACHIEVEMENT_MAP, TOTAL_ACHIEVEMENT_XP }

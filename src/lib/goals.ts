import { exerciseName } from '../data/exercises'
import { toDateKey, todayKey, addDays, diffDays } from './dates'
import { estimatedOneRepMax } from '../data/rpe'
import { countingSets } from './xp'
import { uid } from './id'
import type { Goal, GoalMetric, GoalMilestone, Profile, ProgressSnapshot, WorkoutSession } from '../types'

/**
 * Goal progress.
 *
 * Counting goals (workouts, sets, volume, time) accumulate **from the day the
 * goal was created**, so a goal made today is never instantly complete because
 * of old sessions. Snapshot goals (streak, bodyweight, level) read the current
 * value. Nothing here is estimated or padded — if the number is not in the log,
 * the goal has not moved.
 */

export interface GoalContext {
  sessions: readonly WorkoutSession[]
  progress: Pick<ProgressSnapshot, 'streak' | 'level' | 'totals' | 'prs'>
  profile: Profile
  today?: string
}

export interface GoalEvaluation {
  goal: Goal
  metric: GoalMetric
  /** Value right now, in the goal's own unit. */
  current: number
  target: number
  baseline: number
  /** Distance left in the goal's unit; 0 once complete. */
  needed: number
  /** 0–100, clamped. */
  pct: number
  unit: string
  detail: string
  /** Start of the counting window, when the metric is cumulative. */
  sinceKey?: string
  complete: boolean
  overdue: boolean
  daysLeft: number | null
  nextMilestone?: GoalMilestone
  milestonesDone: number
  /** True when progress cannot be derived and the user must enter it manually. */
  needsInput: boolean
}

export const GOAL_METRIC_LABEL: Record<GoalMetric, string> = {
  workouts: 'Workouts logged',
  sets: 'Sets completed',
  volume: 'Total volume',
  duration: 'Time trained',
  streak: 'Current streak',
  'longest-streak': 'Longest streak',
  'exercise-weight': 'Heaviest set',
  'exercise-reps': 'Most reps',
  'exercise-e1rm': 'Best estimated 1RM',
  bodyweight: 'Bodyweight',
  level: 'Level reached',
  manual: 'Entered by hand',
}

export const GOAL_METRIC_HINT: Record<GoalMetric, string> = {
  workouts: 'Counts every session logged from the day this goal was created.',
  sets: 'Counts every set you marked complete, from the day this goal was created.',
  volume: 'Sums weight × reps across completed sets, from the day this goal was created.',
  duration: 'Sums the duration of every session, from the day this goal was created.',
  streak: 'Your current run of distinct training days — it can fall back to zero.',
  'longest-streak': 'The longest run of distinct training days you have ever held.',
  'exercise-weight': 'The heaviest set logged for one exercise since this goal was created.',
  'exercise-reps': 'The highest rep count logged for one exercise since this goal was created.',
  'exercise-e1rm': 'The best Epley estimate for one exercise since this goal was created.',
  bodyweight: 'Reads the bodyweight on your profile — update it when you weigh in.',
  level: 'Reads your current level, which is earned from logged sessions only.',
  manual: 'Nothing is derived for this goal; you enter the number yourself.',
}

/** Metrics that read a present value rather than accumulating. */
export const SNAPSHOT_METRICS: GoalMetric[] = ['streak', 'longest-streak', 'bodyweight', 'level', 'manual']

/** Metrics measured against one exercise. */
export const EXERCISE_METRICS: GoalMetric[] = ['exercise-weight', 'exercise-reps', 'exercise-e1rm']

export function isSnapshotMetric(metric: GoalMetric): boolean {
  return SNAPSHOT_METRICS.includes(metric)
}

export function metricNeedsExercise(metric: GoalMetric): boolean {
  return EXERCISE_METRICS.includes(metric)
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

/** Sessions that fall inside a goal's counting window. */
export function sessionsSince(sessions: readonly WorkoutSession[], fromKey: string): WorkoutSession[] {
  return sessions.filter((s) => {
    const key = s.date || toDateKey(s.completedAt)
    return Boolean(key) && key >= fromKey
  })
}

export function bestForExerciseSince(sessions: readonly WorkoutSession[], exerciseId: string, metric: GoalMetric): number {
  let best = 0
  for (const session of sessions) {
    for (const log of session.exercises) {
      if (log.exerciseId !== exerciseId || log.skipped) continue
      for (const set of countingSets(log)) {
        if (set.reps <= 0) continue
        let value = 0
        if (metric === 'exercise-weight') value = set.weight
        else if (metric === 'exercise-reps') value = set.reps
        else value = estimatedOneRepMax(set.weight, set.reps)
        if (value > best) best = value
      }
    }
  }
  return Math.round(best * 10) / 10
}

function progressBetween(baseline: number, current: number, target: number, direction: Goal['direction']): number {
  if (direction === 'decrease') {
    const span = baseline - target
    if (span <= 0) return current <= target ? 100 : 0
    return clamp(((baseline - current) / span) * 100, 0, 100)
  }
  const span = target - baseline
  if (span <= 0) return current >= target ? 100 : 0
  return clamp(((current - baseline) / span) * 100, 0, 100)
}

export function goalProgress(goal: Goal, ctx: GoalContext): GoalEvaluation {
  const today = ctx.today ?? todayKey()
  const sinceKey = toDateKey(goal.createdAt) || today
  const window = sessionsSince(ctx.sessions, sinceKey)
  const unit = goal.unit || ''

  let current = 0
  let baseline = Number.isFinite(goal.baseline ?? NaN) ? (goal.baseline as number) : 0
  let needsInput = false
  let detail = ''
  let pct = 0

  switch (goal.metric) {
    case 'workouts':
      current = window.length
      detail = `${current} ${current === 1 ? 'session' : 'sessions'} logged since ${sinceKey}`
      pct = progressBetween(baseline, current, goal.target, goal.direction)
      break
    case 'sets':
      current = window.reduce((n, s) => n + (s.completedSets || 0), 0)
      detail = `${current} sets completed since ${sinceKey}`
      pct = progressBetween(baseline, current, goal.target, goal.direction)
      break
    case 'volume':
      current = Math.round(window.reduce((n, s) => n + (s.volumeKg || 0), 0))
      detail = `${current.toLocaleString()} ${unit || 'kg'} moved since ${sinceKey}`
      pct = progressBetween(baseline, current, goal.target, goal.direction)
      break
    case 'duration':
      current = Math.round(window.reduce((n, s) => n + (s.durationMin || 0), 0))
      detail = `${Math.floor(current / 60)} h ${current % 60} min trained since ${sinceKey}`
      pct = progressBetween(baseline, current, goal.target, goal.direction)
      break
    case 'streak':
      current = ctx.progress.streak.current
      detail =
        current > 0
          ? `${current} ${current === 1 ? 'day' : 'days'} trained in a row${ctx.progress.streak.currentIncludingToday ? '' : ' — today is not logged yet'}`
          : 'No active streak yet — train today to start one'
      pct = clamp((current / Math.max(1, goal.target)) * 100, 0, 100)
      break
    case 'longest-streak':
      current = ctx.progress.streak.longest
      detail = `Longest run ever: ${current} days`
      pct = clamp((current / Math.max(1, goal.target)) * 100, 0, 100)
      break
    case 'exercise-weight':
    case 'exercise-reps':
    case 'exercise-e1rm': {
      const name = goal.exerciseId ? exerciseName(goal.exerciseId) : 'the exercise'
      current = goal.exerciseId ? bestForExerciseSince(window, goal.exerciseId, goal.metric) : 0
      detail = goal.exerciseId
        ? `Best ${GOAL_METRIC_LABEL[goal.metric].toLowerCase()} on ${name} since ${sinceKey}`
        : 'No exercise selected for this goal yet'
      needsInput = !goal.exerciseId
      pct = needsInput ? 0 : progressBetween(baseline, current, goal.target, goal.direction)
      break
    }
    case 'bodyweight': {
      const profileWeight = ctx.profile.bodyweightKg
      if (!Number.isFinite(profileWeight ?? NaN)) {
        needsInput = true
        detail = 'Add your bodyweight on the profile page to track this goal'
        pct = 0
        break
      }
      current = profileWeight as number
      if (baseline <= 0) baseline = current
      detail = `Weighed in at ${current} ${unit || 'kg'}${goal.direction === 'decrease' ? ', aiming down' : ', aiming up'}`
      pct = progressBetween(baseline, current, goal.target, goal.direction)
      break
    }
    case 'level':
      current = ctx.progress.level.level
      detail = `Level ${current} · ${ctx.progress.level.xp.toLocaleString()} XP`
      pct = clamp((current / Math.max(1, goal.target)) * 100, 0, 100)
      break
    case 'manual':
    default:
      needsInput = true
      current = Number.isFinite(goal.progressOverride ?? NaN) ? (goal.progressOverride as number) : 0
      detail = 'You enter this number yourself — nothing is derived.'
      pct = clamp((current / Math.max(1, goal.target)) * 100, 0, 100)
      break
  }

  const complete = Boolean(goal.completedAt) || pct >= 100
  const daysLeft = goal.dueAt ? diffDays(today, goal.dueAt) : null
  const overdue = Boolean(goal.dueAt) && !goal.completedAt && (daysLeft ?? 0) < 0
  const milestonesDone = goal.milestones.filter((m) => m.done).length
  const nextMilestone = goal.milestones.find((m) => !m.done)
  const needed = complete ? 0 : Math.max(0, Math.round((goal.direction === 'decrease' ? current - goal.target : goal.target - current) * 10) / 10)

  return {
    goal,
    metric: goal.metric,
    current: Math.round(current * 10) / 10,
    target: goal.target,
    baseline,
    needed,
    pct: Math.round(pct),
    unit,
    detail,
    sinceKey: isSnapshotMetric(goal.metric) ? undefined : sinceKey,
    complete,
    overdue,
    daysLeft,
    nextMilestone,
    milestonesDone,
    needsInput,
  }
}

export function evaluateGoals(goals: readonly Goal[], ctx: GoalContext, includeClosed = false): GoalEvaluation[] {
  return goals
    .filter((g) => includeClosed || (!g.completedAt && !g.abandonedAt))
    .map((g) => goalProgress(g, ctx))
    .sort((a, b) => b.pct - a.pct || (a.goal.createdAt || '').localeCompare(b.goal.createdAt || ''))
}

/* --------------------------------------------------------------------------
   Building goals
   -------------------------------------------------------------------------- */

export function defaultMilestones(target: number, unit: string, count = 3): GoalMilestone[] {
  if (!Number.isFinite(target) || target <= 0) return []
  return Array.from({ length: count }, (_, i) => {
    const fraction = (i + 1) / (count + 1)
    const value = Math.round(target * fraction * 10) / 10
    return {
      id: uid('ms'),
      label: `${value}${unit ? ` ${unit}` : ''} — ${Math.round(fraction * 100)}% of the way`,
      done: false,
    }
  })
}

/** A sensible due date: 12 weeks out, matching the review cadence in goals.md. */
export function defaultDueDate(from = todayKey(), weeks = 12): string {
  return addDays(from, weeks * 7)
}

export function goalSummary(evaluation: GoalEvaluation): string {
  const { goal, pct, needed, unit } = evaluation
  if (goal.completedAt) return 'Completed'
  if (goal.abandonedAt) return 'Abandoned'
  if (pct >= 100) return 'Target reached — mark it complete'
  if (evaluation.overdue) return `Past its due date with ${needed}${unit ? ` ${unit}` : ''} to go`
  return `${needed}${unit ? ` ${unit}` : ''} to go`
}

import { bestForExerciseSince, defaultDueDate, defaultMilestones } from '../lib/goals'
import { todayKey } from '../lib/dates'
import { uid } from '../lib/id'
import type { Goal, GoalCategory, GoalMetric, Profile, ProgressSnapshot, WorkoutSession } from '../types'

export type GoalDirection = Goal['direction']

/**
 * Ready-made goals, transcribed from the prompts in `goals.md`.
 *
 * goals.md is a blank worksheet: "the one thing", a primary goal, up to three
 * supporting goals, and non-negotiables. These templates are those prompts with
 * real numbers attached, so a user can adopt one in a click and then edit it.
 * Every template states which section of the handbook it came from.
 */

export interface GoalTemplate {
  id: string
  title: string
  detail: string
  category: GoalCategory
  metric: GoalMetric
  exerciseId?: string
  target: number
  unit: string
  direction: GoalDirection
  /** How many weeks the goal is meant to take — used for the default due date. */
  weeks: number
  why: string
  /** Section of goals.md this came from. */
  source: string
  /** Milestone labels, in order. Values are generated from the target. */
  milestones?: string[]
}

export const GOAL_TEMPLATES: readonly GoalTemplate[] = Object.freeze([
  {
    id: 'tpl-one-thing-squat',
    title: 'Squat my bodyweight for 5 reps',
    detail: 'The example "one thing" from the handbook, made measurable.',
    category: 'strength',
    metric: 'exercise-reps',
    exerciseId: 'back-squat',
    target: 5,
    unit: 'reps at bodyweight',
    direction: 'increase',
    weeks: 12,
    why: 'A bodyweight squat for reps means the whole lower body is strong enough to carry everything else.',
    source: 'goals.md · 1. The one thing',
  },
  {
    id: 'tpl-one-thing-consistency',
    title: 'Train 3× a week without missing one',
    detail: '36 sessions over 12 weeks. Consistency, not intensity.',
    category: 'habit',
    metric: 'workouts',
    target: 36,
    unit: 'sessions',
    direction: 'increase',
    weeks: 12,
    why: 'Frequency is the variable that decides whether any programme works. Everything else is a detail.',
    source: 'goals.md · 1. The one thing',
    milestones: ['12 sessions — a month done', '24 sessions — two-thirds', '30 sessions — the last fortnight'],
  },
  {
    id: 'tpl-one-thing-fat-loss',
    title: 'Lose 5 kg and keep my strength',
    detail: 'Weight down while the main lifts hold. Set your baseline from the profile page.',
    category: 'fat-loss',
    metric: 'bodyweight',
    target: -5,
    unit: 'kg',
    direction: 'decrease',
    weeks: 12,
    why: 'Losing weight that you did not need, without losing the strength you worked for.',
    source: 'goals.md · 1. The one thing',
  },
  {
    id: 'tpl-primary-strength',
    title: 'Add 20 kg to my deadlift top set',
    detail: 'One number, one lift, one deadline. This is the "primary goal" row.',
    category: 'strength',
    metric: 'exercise-weight',
    exerciseId: 'conventional-deadlift',
    target: 20,
    unit: 'kg added',
    direction: 'increase',
    weeks: 12,
    why: 'The hinge is the biggest movement I have; progress there shows up everywhere else.',
    source: 'goals.md · 2. Primary goal',
  },
  {
    id: 'tpl-primary-press',
    title: 'Press 0.75× bodyweight overhead',
    detail: 'A strict standing press, no leg drive.',
    category: 'strength',
    metric: 'exercise-weight',
    exerciseId: 'overhead-press',
    target: 60,
    unit: 'kg',
    direction: 'increase',
    weeks: 16,
    why: 'Overhead strength is the honest measure of upper-body pressing — nothing to hide behind.',
    source: 'goals.md · 2. Primary goal',
  },
  {
    id: 'tpl-support-bench',
    title: 'Bench press 100 kg for 1',
    detail: 'A round number worth working towards.',
    category: 'strength',
    metric: 'exercise-weight',
    exerciseId: 'bench-press',
    target: 100,
    unit: 'kg',
    direction: 'increase',
    weeks: 16,
    why: 'It is the lift everyone asks about, and chasing it keeps the push days honest.',
    source: 'goals.md · 3. Supporting goals',
  },
  {
    id: 'tpl-support-pullup',
    title: 'Five strict pull-ups',
    detail: 'Chin over the bar, no kipping, full lockout at the bottom.',
    category: 'skill',
    metric: 'exercise-reps',
    exerciseId: 'pull-up',
    target: 5,
    unit: 'reps',
    direction: 'increase',
    weeks: 12,
    why: 'Bodyweight pulling is the counterpart to pressing, and most people neglect it.',
    source: 'goals.md · 3. Supporting goals',
  },
  {
    id: 'tpl-support-volume',
    title: 'Move 20 000 kg in a month',
    detail: 'Total volume across four weeks of training.',
    category: 'muscle',
    metric: 'volume',
    target: 20000,
    unit: 'kg',
    direction: 'increase',
    weeks: 4,
    why: 'Volume is the main driver of muscle growth, and it is the easiest thing to let slip.',
    source: 'goals.md · 3. Supporting goals',
  },
  {
    id: 'tpl-nonneg-floor',
    title: 'Non-negotiable: two sessions every week',
    detail: 'The floor, not the ceiling. 24 sessions over 12 weeks, whatever the week looks like.',
    category: 'habit',
    metric: 'workouts',
    target: 24,
    unit: 'sessions',
    direction: 'increase',
    weeks: 12,
    why: 'Two sessions of thirty minutes in the worst week beats a perfect plan I abandon in week three.',
    source: 'goals.md · 5. Non-negotiables',
    milestones: ['6 sessions — three weeks held', '12 sessions — halfway', '18 sessions — three-quarters'],
  },
  {
    id: 'tpl-streak-30',
    title: 'Hold a 30-day training streak',
    detail: 'Thirty distinct days with something logged. A walk or mobility session counts if you log it.',
    category: 'habit',
    metric: 'streak',
    target: 30,
    unit: 'days',
    direction: 'increase',
    weeks: 6,
    why: 'Streaks are a habit tool, not a fitness goal — they make showing up the default.',
    source: 'goals.md · 6. How I will know it is working',
  },
  {
    id: 'tpl-check-frequency',
    title: 'Complete 90% of planned sessions',
    detail: '27 of 30 planned sessions over ten weeks.',
    category: 'habit',
    metric: 'workouts',
    target: 27,
    unit: 'sessions',
    direction: 'increase',
    weeks: 10,
    why: '"Am I training?" is the first check in the handbook, and it is answered by the log, not by intention.',
    source: 'goals.md · 6. How I will know it is working',
  },
  {
    id: 'tpl-core-plank',
    title: 'Hold a 90-second plank',
    detail: 'One continuous hold, hips level, logged in seconds.',
    category: 'fitness',
    metric: 'exercise-reps',
    exerciseId: 'plank',
    target: 90,
    unit: 'seconds',
    direction: 'increase',
    weeks: 8,
    why: 'Trunk endurance protects the squats and deadlifts when the load gets heavy.',
    source: 'goals.md · 3. Supporting goals',
  },
  {
    id: 'tpl-level-5',
    title: 'Reach level 5 in Forge',
    detail: '1 000 XP, earned only from sessions you actually logged.',
    category: 'other',
    metric: 'level',
    target: 5,
    unit: 'level',
    direction: 'increase',
    weeks: 8,
    why: 'A proxy for "did I keep showing up" — the XP has no other source.',
    source: 'goals.md · 6. How I will know it is working',
  },
  {
    id: 'tpl-conditioning',
    title: 'Row 2 000 m without stopping',
    detail: 'One continuous effort on the rower.',
    category: 'fitness',
    metric: 'exercise-reps',
    exerciseId: 'rowing-machine',
    target: 2000,
    unit: 'metres',
    direction: 'increase',
    weeks: 10,
    why: 'Conditioning makes the strength work recoverable between sets.',
    source: 'goals.md · 3. Supporting goals',
  },
])

export const GOAL_TEMPLATE_MAP: Readonly<Record<string, GoalTemplate>> = Object.freeze(
  GOAL_TEMPLATES.reduce<Record<string, GoalTemplate>>((acc, t) => {
    acc[t.id] = t
    return acc
  }, {}),
)

export const GOAL_CATEGORY_LABEL: Record<GoalCategory, string> = {
  strength: 'Strength',
  muscle: 'Muscle',
  'fat-loss': 'Fat loss',
  fitness: 'General fitness',
  habit: 'Habit',
  skill: 'Skill',
  body: 'Body',
  other: 'Other',
}

export interface GoalBuildContext {
  sessions: readonly WorkoutSession[]
  progress: ProgressSnapshot
  profile: Profile
  today?: string
}

/**
 * Turns a template into a real goal, capturing an honest baseline at the moment
 * of creation. A "+20 kg deadlift" goal starts from today's best deadlift, not
 * from zero — otherwise it would already be complete.
 */
export function goalFromTemplate(template: GoalTemplate, ctx: GoalBuildContext): Goal {
  const today = ctx.today ?? todayKey()
  const createdAt = new Date().toISOString()
  let baseline = 0
  let target = template.target
  let unit = template.unit

  if (template.metric === 'bodyweight') {
    const weight = Number.isFinite(ctx.profile.bodyweightKg ?? NaN) ? (ctx.profile.bodyweightKg as number) : 0
    baseline = weight
    // The template stores the change ("-5 kg"); the goal stores the absolute target.
    target = weight > 0 ? Math.max(0, Math.round((weight + template.target) * 10) / 10) : Math.abs(template.target)
    unit = ctx.profile.units
  } else if (template.metric === 'exercise-weight' || template.metric === 'exercise-reps' || template.metric === 'exercise-e1rm') {
    const best = template.exerciseId ? bestForExerciseSince(ctx.sessions, template.exerciseId, template.metric) : 0
    // "+20 kg added" templates are relative; absolute ones are not.
    const relative = /added/.test(template.unit)
    if (relative) {
      baseline = best
      target = Math.round((best + template.target) * 10) / 10
      unit = template.unit.replace(' added', '')
    } else {
      baseline = best
    }
  } else if (template.metric === 'streak') {
    baseline = ctx.progress.streak.current
  } else if (template.metric === 'level') {
    baseline = ctx.progress.level.level
  }

  const milestoneLabels = template.milestones
  const milestones = milestoneLabels
    ? milestoneLabels.map((label) => ({ id: uid('ms'), label, done: false }))
    : defaultMilestones(target - baseline > 0 ? target - baseline : target, unit, 3)

  return {
    id: uid('goal'),
    title: template.title,
    detail: template.detail,
    category: template.category,
    metric: template.metric,
    exerciseId: template.exerciseId,
    target,
    unit,
    baseline: baseline > 0 ? baseline : undefined,
    direction: template.direction,
    createdAt,
    dueAt: defaultDueDate(today, template.weeks),
    milestones,
    why: template.why,
  }
}

export const GOAL_REVIEW_CADENCE = [
  { check: 'Am I training?', cadence: 'Weekly', metric: 'Sessions completed vs sessions planned' },
  { check: 'Am I getting stronger?', cadence: 'Weekly', metric: 'Top sets and personal records' },
  { check: 'Is my body changing?', cadence: 'Monthly', metric: 'Bodyweight and measurements' },
  { check: 'Am I recovering?', cadence: 'Weekly', metric: 'Sleep, soreness and mood per session' },
]

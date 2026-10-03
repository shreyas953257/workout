/**
 * Forge domain model.
 *
 * Everything the user *does* is stored (sessions, goals, profile, preferences).
 * Everything the user *earns* — XP, level, streaks, achievements, unlocks, PRs —
 * is derived from that by pure replay in `lib/progress.ts`. Derived state can
 * never drift, be faked, or desync from the log.
 */

/* ------------------------------------------------------------------ *
 * Exercise library
 * ------------------------------------------------------------------ */

export type MuscleGroup =
  | 'quads'
  | 'glutes'
  | 'hamstrings'
  | 'calves'
  | 'adductors'
  | 'chest'
  | 'lats'
  | 'upper-back'
  | 'traps'
  | 'rear-delts'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'cardio'

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'push-horizontal'
  | 'push-vertical'
  | 'pull-vertical'
  | 'pull-horizontal'
  | 'unilateral-leg'
  | 'isolation'
  | 'core'
  | 'carry'
  | 'conditioning'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'band'
  | 'bodyweight'
  | 'trap-bar'
  | 'none'

/** Drives base XP and how a session is ordered/weighted. */
export type ExerciseTier = 'compound' | 'accessory' | 'isolation' | 'core' | 'conditioning'

export type SetUnit = 'reps' | 'seconds' | 'metres'

export interface FormError {
  error: string
  fix: string
}

export interface Exercise {
  id: string
  name: string
  /** Short display name for tight layouts. */
  short?: string
  pattern: MovementPattern
  /** Primary muscles first. */
  muscles: MuscleGroup[]
  secondary: MuscleGroup[]
  equipment: Equipment[]
  tier: ExerciseTier
  /** Base XP per completed set, before RPE and programme multipliers. */
  xpPerSet: number
  unit: SetUnit
  /** Per-side movement (lunges, single-leg work, side plank). */
  perSide?: boolean
  cues: string[]
  setup?: string
  depth?: string
  commonErrors: FormError[]
  /** Exercise ids offered as pain-free or equipment-free alternatives. */
  substitutions: string[]
  notes?: string
  /** Markdown file this entry was transcribed from. */
  source: string
  /** True when the movement is gated behind an unlock. */
  advanced?: boolean
  unlockId?: string
  /** Rough seconds for one set at a normal tempo — used for session estimates. */
  estSetSeconds?: number
}

/* ------------------------------------------------------------------ *
 * Programmes — transcribed from programs/*.md
 * ------------------------------------------------------------------ */

export interface ProgramExercise {
  exerciseId: string
  sets: number
  /** Human-readable target exactly as written in the source doc, e.g. "8–12". */
  target: string
  repsMin: number
  repsMax: number
  unit: SetUnit
  rpe: string
  restSec: number
  perSide?: boolean
  optional?: boolean
  /** Structural note, e.g. "top set, then 3 back-off sets at −10%". */
  scheme?: string
  tempo?: string
}

export type DayEmphasis = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'conditioning'

export interface ProgramDay {
  id: string
  /** "Workout A — squat, horizontal push/pull" */
  name: string
  /** "A" */
  badge: string
  emphasis: DayEmphasis
  summary: string
  exercises: ProgramExercise[]
  estimatedMin: number
}

/**
 * A block can rewrite the default scheme for the weeks it covers: more sets,
 * fewer reps, a deload load factor, and so on. `resolveDayForWeek` applies
 * these so that starting a workout in week 6 gives you week 6's numbers.
 */
export interface BlockOverride {
  /** Apply to exercises of this tier. */
  tier?: ExerciseTier
  /** Apply to these 0-based positions in the day. */
  positions?: number[]
  /** Relative change to the set count. */
  setDelta?: number
  /** Absolute set count. */
  sets?: number
  repsMin?: number
  repsMax?: number
  target?: string
  rpe?: string
  /** Multiply the prescribed load by this factor (0.8 for a deload). */
  loadFactor?: number
}

export interface ProgramBlock {
  id: string
  label: string
  /** 1-based week numbers inside the programme. */
  weeks: number[]
  headline: string
  detail: string
  deload?: boolean
  /** Per-block rewrites of the default set/rep scheme. */
  adjustments?: string[]
  overrides?: BlockOverride[]
}

export interface ScheduleSlot {
  day: string
  dayIndex: number
  dayId?: string
  label: string
}

export interface Program {
  id: string
  name: string
  tagline: string
  level: 'beginner' | 'intermediate' | 'home'
  daysPerWeek: number
  totalWeeks: number
  equipment: string[]
  progressionModel: 'linear' | 'double' | 'mechanical'
  progressionSummary: string
  overview: string
  whyItWorks: string
  schedule: ScheduleSlot[]
  alternativeSchedules?: string[]
  days: ProgramDay[]
  blocks: ProgramBlock[]
  progressionRules: string[]
  increments?: { lift: string; amount: string }[]
  notes: string[]
  /** Markdown file this programme was transcribed from. */
  sourceFile: string
  /** Set when the programme is gated behind an unlock. */
  unlockId?: string
}

/* ------------------------------------------------------------------ *
 * Logging — the source of truth
 * ------------------------------------------------------------------ */

export interface SetEntry {
  id: string
  /** Reps, or seconds/metres when the exercise uses another unit. */
  reps: number
  /** kg (or lb, per profile.units). 0 for pure bodyweight. */
  weight: number
  rpe?: number
  completed: boolean
  warmup?: boolean
}

export interface ExerciseLog {
  exerciseId: string
  /** Snapshot of the name — survives later edits to the library. */
  name: string
  unit: SetUnit
  sets: SetEntry[]
  target?: string
  rpeTarget?: string
  skipped: boolean
  note?: string
  substitutedFrom?: string
}

export interface XpAward {
  kind: XpKind
  label: string
  amount: number
}

export type XpKind =
  | 'set'
  | 'workout'
  | 'volume'
  | 'pr'
  | 'streak'
  | 'achievement'
  | 'goal'
  | 'goal-milestone'

export interface PrSnapshot {
  exerciseId: string
  exerciseName: string
  kind: 'weight' | 'reps' | 'e1rm' | 'volume'
  value: number
  detail: string
}

export interface WorkoutSession {
  id: string
  /** ISO timestamp. */
  startedAt: string
  completedAt: string
  /** Local calendar day, YYYY-MM-DD — the unit streaks and calendars use. */
  date: string
  title: string
  programId?: string
  dayId?: string
  exercises: ExerciseLog[]
  durationMin: number
  notes?: string
  mood?: 1 | 2 | 3 | 4 | 5
  energy?: 1 | 2 | 3 | 4 | 5
  sleepHours?: number
  bodyweightKg?: number
  deload?: boolean
  /** Derived from the logged sets — recomputed on every validation so a
   *  hand-edited file cannot inflate history. */
  xp: number
  xpBreakdown: XpAward[]
  volumeKg: number
  completedSets: number
  prs: PrSnapshot[]
  origin: 'live' | 'manual' | 'import' | 'seed'
}

/* ------------------------------------------------------------------ *
 * Goals
 * ------------------------------------------------------------------ */

export type GoalCategory =
  | 'strength'
  | 'muscle'
  | 'fat-loss'
  | 'fitness'
  | 'habit'
  | 'skill'
  | 'body'
  | 'other'

/** How goal progress is computed from real data. `manual` uses progressOverride. */
export type GoalMetric =
  | 'workouts'
  | 'sets'
  | 'volume'
  | 'duration'
  | 'streak'
  | 'longest-streak'
  | 'exercise-weight'
  | 'exercise-reps'
  | 'exercise-e1rm'
  | 'bodyweight'
  | 'level'
  | 'manual'

export interface GoalMilestone {
  id: string
  label: string
  done: boolean
  completedAt?: string
}

export interface Goal {
  id: string
  title: string
  detail?: string
  category: GoalCategory
  metric: GoalMetric
  /** Exercise the metric is measured against, when relevant. */
  exerciseId?: string
  target: number
  unit: string
  /** Baseline captured at creation so progress is honest. */
  baseline?: number
  direction: 'increase' | 'decrease'
  createdAt: string
  dueAt?: string
  completedAt?: string
  abandonedAt?: string
  milestones: GoalMilestone[]
  progressOverride?: number
  /** Mirrors goals.md — the "why it matters to me" line. */
  why?: string
}

/* ------------------------------------------------------------------ *
 * Gamification
 * ------------------------------------------------------------------ */

export interface LevelInfo {
  level: number
  title: string
  xp: number
  floor: number
  ceiling: number
  into: number
  needed: number
  pct: number
}

export interface XpEvent {
  at: string
  date: string
  amount: number
  cumulative: number
  kind: XpKind
  label: string
  sessionId?: string
}

export interface StreakInfo {
  current: number
  longest: number
  /** Consecutive-day streak as of today, ignoring a gap that only just opened. */
  currentIncludingToday: boolean
  lastWorkoutDate?: string
  totalDays: number
  freezeUsed?: number
}

export type AchievementCategory =
  | 'volume'
  | 'consistency'
  | 'strength'
  | 'milestone'
  | 'exploration'
  | 'discipline'

export interface Achievement {
  id: string
  name: string
  description: string
  category: AchievementCategory
  xp: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'mythic'
  /** What must be true. Evaluated by lib/achievements.ts. */
  condition: AchievementCondition
  /** Human-readable requirement, shown while locked. */
  requirement: string
  icon: string
}

export type AchievementCondition =
  | { type: 'workouts'; count: number }
  | { type: 'sets'; count: number }
  | { type: 'streak'; days: number }
  | { type: 'longestStreak'; days: number }
  | { type: 'prs'; count: number }
  | { type: 'level'; level: number }
  | { type: 'volume'; kg: number }
  | { type: 'duration'; minutes: number }
  | { type: 'distinctExercises'; count: number }
  | { type: 'goalsCompleted'; count: number }
  | { type: 'sessionsWithNotes'; count: number }
  | { type: 'deloadSessions'; count: number }
  | { type: 'programmeBlocks'; count: number }
  | { type: 'weekendSessions'; count: number }
  | { type: 'earlySessions'; count: number }
  | { type: 'lateSessions'; count: number }
  | { type: 'longSessions'; minutes: number; count: number }
  | { type: 'bodyweightMultiple'; exerciseId: string; multiple: number; reps?: number }
  | { type: 'perfectWeeks'; count: number }
  | { type: 'xp'; amount: number }

export interface AchievementState {
  id: string
  unlocked: boolean
  unlockedAt?: string
  /** The event that satisfied the condition. */
  reason?: string
  progress: number
  target: number
}

export type UnlockKind = 'program' | 'exercise' | 'theme' | 'feature' | 'title'

export interface UnlockDef {
  id: string
  name: string
  description: string
  kind: UnlockKind
  /** What it grants access to. */
  grants: string
  condition: UnlockCondition
  requirement: string
  icon: string
}

export type UnlockCondition =
  | { type: 'level'; level: number }
  | { type: 'workouts'; count: number }
  | { type: 'streak'; days: number }
  | { type: 'xp'; amount: number }
  | { type: 'achievements'; count: number }
  | { type: 'volume'; kg: number }
  | { type: 'any'; of: [UnlockCondition, UnlockCondition] }

export interface UnlockEvent {
  id: string
  name: string
  kind: UnlockKind
  unlockedAt: string
  reason: string
  levelAtUnlock: number
  xpAtUnlock: number
  grants: string
}

/* ------------------------------------------------------------------ *
 * Personal records
 * ------------------------------------------------------------------ */

export interface PrEntry {
  date: string
  weight: number
  reps: number
  e1rm: number
  volume: number
  sessionId: string
}

export interface PersonalRecord {
  exerciseId: string
  exerciseName: string
  unit: SetUnit
  bestWeight: number
  bestWeightReps: number
  bestWeightDate: string
  bestReps: number
  bestRepsWeight: number
  bestRepsDate: string
  bestE1rm: number
  bestE1rmDetail: string
  bestE1rmDate: string
  bestVolume: number
  bestVolumeDate: string
  totalSets: number
  history: PrEntry[]
}

/* ------------------------------------------------------------------ *
 * Profile, preferences, persisted state
 * ------------------------------------------------------------------ */

export type ThemeId = 'ember' | 'frost' | 'voltage' | 'verdant' | 'obsidian' | 'aurora'

export interface Profile {
  displayName: string
  bodyweightKg?: number
  heightCm?: number
  units: 'kg' | 'lb'
  joinedAt: string
  avatarSeed: string
}

export interface Preferences {
  theme: ThemeId
  motion: 'auto' | 'reduced' | 'full'
  defaultRestSec: number
  sound: boolean
  autoStartRest: boolean
  weekStartsOn: 0 | 1
  activeProgramId?: string
  /** Index into the active programme's rotation, so "today's workout" is stable. */
  rotationIndex: number
  compactTables: boolean
  showDocSources: boolean
}

export interface AppData {
  version: number
  sessions: WorkoutSession[]
  goals: Goal[]
  profile: Profile
  preferences: Preferences
  /** Ids of level-up / achievement toasts already shown, so they don't repeat. */
  acknowledged: string[]
  createdAt: string
  updatedAt: string
  lastExportAt?: string
}

/* ------------------------------------------------------------------ *
 * Derived progress
 * ------------------------------------------------------------------ */

export interface WeeklyBucket {
  weekStart: string
  label: string
  workouts: number
  sets: number
  volumeKg: number
  xp: number
  durationMin: number
}

export interface ProgressSnapshot {
  xp: number
  level: LevelInfo
  levelHistory: { level: number; at: string }[]
  xpEvents: XpEvent[]
  xpByDay: Record<string, number>
  streak: StreakInfo
  achievements: AchievementState[]
  unlockedIds: string[]
  unlockEvents: UnlockEvent[]
  prs: Record<string, PersonalRecord>
  prCount: number
  totals: {
    workouts: number
    sets: number
    volumeKg: number
    durationMin: number
    distinctExercises: number
    goalsCompleted: number
    firstWorkoutAt?: string
    lastWorkoutAt?: string
  }
  weekly: WeeklyBucket[]
  /** Ids unlocked since the last time the user looked, for the toast queue. */
  newlyUnlocked: string[]
}

export type SortDir = 'asc' | 'desc'

export interface ValidationIssue {
  field: string
  message: string
}

export interface ValidationResult<T> {
  ok: boolean
  value?: T
  issues: ValidationIssue[]
}

export interface ImportResult {
  ok: boolean
  mode: 'replace' | 'merge'
  imported: { sessions: number; goals: number; profile: boolean; preferences: boolean }
  skipped: number
  issues: ValidationIssue[]
}

/**
 * Validation.
 *
 * Every value that reaches storage — typed by the user, produced by an in-flight
 * session, or handed over by an import — passes through here. The rules are
 * deliberately generous at the top end (a 700 kg deadlift is plausible) and
 * strict at the bottom (nothing negative, nothing NaN, nothing in the future).
 */

import type {
  AppData,
  ExerciseLog,
  Goal,
  Preferences,
  Profile,
  SetEntry,
  SetUnit,
  ValidationIssue,
  ValidationResult,
  WorkoutSession,
} from '../types'
import { EXERCISE_MAP } from '../data/exercises'
import { withComputedTotals } from './xp'
import { isPlausibleDate, isValidDateKey, toDateKey, todayKey } from './dates'

export const LIMITS = {
  maxWeight: 1000,
  maxReps: 500,
  maxSeconds: 3600,
  maxMetres: 100000,
  maxSets: 40,
  maxExercises: 60,
  maxDurationMin: 720,
  maxNotes: 4000,
  maxName: 120,
  maxGoalTitle: 140,
  maxGoalDetail: 2000,
  maxMilestones: 50,
  maxBodyweight: 500,
  maxHeight: 260,
  maxRpe: 10,
  minRpe: 1,
  /** Sessions dated this far in the future are rejected. */
  futureToleranceDays: 1,
} as const

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function toFiniteNumber(v: unknown, fallback = 0): number {
  if (isFiniteNumber(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/,/g, ''))
    if (Number.isFinite(n)) return n
  }
  return fallback
}

/** Trims, collapses internal whitespace runs, and hard-truncates. */
export function sanitizeString(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.replace(/\s+/g, ' ').trim().slice(0, max)
}

export function sanitizeUnit(v: unknown): SetUnit {
  return v === 'seconds' || v === 'metres' ? v : 'reps'
}

function issue(field: string, message: string): ValidationIssue {
  return { field, message }
}

function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value, issues: [] }
}

function fail<T>(issues: ValidationIssue[]): ValidationResult<T> {
  return { ok: false, issues }
}

/* ------------------------------------------------------------------ *
 * Sets
 * ------------------------------------------------------------------ */

export function maxForUnit(unit: SetUnit): number {
  if (unit === 'seconds') return LIMITS.maxSeconds
  if (unit === 'metres') return LIMITS.maxMetres
  return LIMITS.maxReps
}

export function validateSet(raw: unknown, unit: SetUnit = 'reps', path = 'set'): ValidationResult<SetEntry> {
  const issues: ValidationIssue[] = []
  if (!raw || typeof raw !== 'object') return fail([issue(path, 'Set must be an object')])
  const r = raw as Record<string, unknown>

  const repsRaw = toFiniteNumber(r.reps, Number.NaN)
  if (!Number.isFinite(repsRaw)) issues.push(issue(`${path}.reps`, 'Reps must be a number'))
  else if (repsRaw < 0) issues.push(issue(`${path}.reps`, 'Reps cannot be negative'))
  else if (repsRaw > maxForUnit(unit)) issues.push(issue(`${path}.reps`, `Reps cannot exceed ${maxForUnit(unit)}`))

  // Weight is optional: bodyweight work, timed holds and carries are logged
  // with no load at all. Only a *present but impossible* value is rejected.
  const hasWeight = r.weight != null && r.weight !== ''
  const weightRaw = hasWeight ? toFiniteNumber(r.weight, Number.NaN) : 0
  if (!Number.isFinite(weightRaw)) issues.push(issue(`${path}.weight`, 'Weight must be a number'))
  else if (weightRaw < 0) issues.push(issue(`${path}.weight`, 'Weight cannot be negative'))
  else if (weightRaw > LIMITS.maxWeight) issues.push(issue(`${path}.weight`, `Weight cannot exceed ${LIMITS.maxWeight} kg`))

  let rpe: number | undefined
  if (r.rpe != null && r.rpe !== '') {
    const rpeRaw = toFiniteNumber(r.rpe, Number.NaN)
    if (!Number.isFinite(rpeRaw)) issues.push(issue(`${path}.rpe`, 'RPE must be a number'))
    else if (rpeRaw < LIMITS.minRpe || rpeRaw > LIMITS.maxRpe) {
      issues.push(issue(`${path}.rpe`, `RPE must be between ${LIMITS.minRpe} and ${LIMITS.maxRpe}`))
    } else rpe = rpeRaw
  }

  if (issues.length) return fail(issues)

  const reps = Number.isFinite(repsRaw) ? Math.max(0, Math.round(repsRaw)) : 0
  const weight = Number.isFinite(weightRaw) ? Math.max(0, Math.round(weightRaw * 100) / 100) : 0

  return ok<SetEntry>({
    id: sanitizeString(r.id, 64) || `set_${reps}_${weight}_${Math.random().toString(36).slice(2, 8)}`,
    reps,
    weight,
    rpe,
    completed: r.completed !== false,
    warmup: r.warmup === true,
  })
}

/* ------------------------------------------------------------------ *
 * Exercise logs
 * ------------------------------------------------------------------ */

export function validateExerciseLog(raw: unknown, path = 'exercise'): ValidationResult<ExerciseLog> {
  const issues: ValidationIssue[] = []
  if (!raw || typeof raw !== 'object') return fail([issue(path, 'Exercise log must be an object')])
  const r = raw as Record<string, unknown>

  const exerciseId = sanitizeString(r.exerciseId, 64)
  if (!exerciseId) issues.push(issue(`${path}.exerciseId`, 'An exercise id is required'))

  // The library is the source of truth for the display name and the unit, but a
  // stored snapshot wins when it exists — that keeps history readable even if an
  // exercise is later renamed or retired.
  const known = exerciseId ? EXERCISE_MAP[exerciseId] : undefined
  const unit = r.unit == null || r.unit === '' ? (known?.unit ?? 'reps') : sanitizeUnit(r.unit)
  const name = sanitizeString(r.name, LIMITS.maxName) || known?.name || ''
  if (!name) issues.push(issue(`${path}.name`, 'An exercise name is required'))

  const rawSets = Array.isArray(r.sets) ? r.sets.slice(0, LIMITS.maxSets) : []
  const sets: SetEntry[] = []
  // Individual unreadable sets are dropped and reported, not fatal: losing one
  // row of a hand-edited file should not cost the whole exercise.
  const warnings: ValidationIssue[] = []
  rawSets.forEach((raw, i) => {
    const res = validateSet(raw, unit, `${path}.sets[${i}]`)
    if (res.ok && res.value) sets.push(res.value)
    else warnings.push(issue(`${path}.sets[${i}]`, 'A set was unreadable and was skipped.'))
  })
  if (rawSets.length > LIMITS.maxSets) {
    warnings.push(issue(`${path}.sets`, `Only the first ${LIMITS.maxSets} sets of this exercise were kept.`))
  }

  // An exercise entry has to mean something: either sets were logged, or it was
  // deliberately skipped. Anything else is an editing accident.
  if (sets.length === 0 && r.skipped !== true) {
    issues.push(issue(`${path}.sets`, 'No sets were recorded for this exercise'))
  }

  if (issues.length) return fail(issues)

  const note = sanitizeString(r.note, LIMITS.maxNotes)
  const value: ExerciseLog = {
    exerciseId,
    name,
    unit,
    sets,
    target: sanitizeString(r.target, 32) || undefined,
    rpeTarget: sanitizeString(r.rpeTarget, 24) || undefined,
    skipped: r.skipped === true,
    note: note || undefined,
    substitutedFrom: sanitizeString(r.substitutedFrom, 64) || undefined,
  }
  return { ok: true, value, issues: warnings }
}

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ */

export function validateSession(raw: unknown, path = 'session', today = todayKey()): ValidationResult<WorkoutSession> {
  const issues: ValidationIssue[] = []
  if (!raw || typeof raw !== 'object') return fail([issue(path, 'Session must be an object')])
  const r = raw as Record<string, unknown>

  const id = sanitizeString(r.id, 64)
  if (!id) issues.push(issue(`${path}.id`, 'A session id is required'))

  const title = sanitizeString(r.title, LIMITS.maxName)
  if (!title) issues.push(issue(`${path}.title`, 'A session title is required'))

  // Dates: accept an ISO string or a date key, normalise both.
  const startedKey = typeof r.startedAt === 'string' ? toDateKey(r.startedAt) : ''
  const completedKey = typeof r.completedAt === 'string' ? toDateKey(r.completedAt) : ''
  const dateKey = sanitizeString(r.date, 10)
  const resolvedDate = isValidDateKey(dateKey) ? dateKey : completedKey || startedKey
  if (!isValidDateKey(resolvedDate)) {
    issues.push(issue(`${path}.date`, 'A valid date (YYYY-MM-DD) is required'))
  } else if (!isPlausibleDate(resolvedDate, today, LIMITS.futureToleranceDays)) {
    issues.push(issue(`${path}.date`, 'Session date cannot be in the future'))
  }

  const rawExercises = Array.isArray(r.exercises) ? r.exercises.slice(0, LIMITS.maxExercises) : []
  const exercises: ExerciseLog[] = []
  const warnings: ValidationIssue[] = []
  rawExercises.forEach((raw, i) => {
    const res = validateExerciseLog(raw, `${path}.exercises[${i}]`)
    if (res.ok && res.value) {
      exercises.push(res.value)
      if (res.issues.length && warnings.length < 10) warnings.push(...res.issues.slice(0, 2))
    } else {
      warnings.push(issue(`${path}.exercises[${i}]`, 'An exercise entry was unreadable and was skipped.'))
    }
  })
  if (rawExercises.length > LIMITS.maxExercises) {
    warnings.push(issue(`${path}.exercises`, `Only the first ${LIMITS.maxExercises} exercises were kept.`))
  }
  if (exercises.length === 0) {
    issues.push(issue(`${path}.exercises`, 'A workout has to contain at least one exercise'))
  }

  const durationRaw = toFiniteNumber(r.durationMin, Number.NaN)
  if (!Number.isFinite(durationRaw)) issues.push(issue(`${path}.durationMin`, 'Duration must be a number'))
  else if (durationRaw < 0) issues.push(issue(`${path}.durationMin`, 'Duration cannot be negative'))
  else if (durationRaw > LIMITS.maxDurationMin) {
    issues.push(issue(`${path}.durationMin`, `Duration cannot exceed ${LIMITS.maxDurationMin} minutes`))
  }

  const sleepRaw = r.sleepHours == null ? undefined : toFiniteNumber(r.sleepHours, Number.NaN)
  if (sleepRaw != null && (!Number.isFinite(sleepRaw) || sleepRaw < 0 || sleepRaw > 24)) {
    issues.push(issue(`${path}.sleepHours`, 'Sleep hours must be between 0 and 24'))
  }

  const bwRaw = r.bodyweightKg == null ? undefined : toFiniteNumber(r.bodyweightKg, Number.NaN)
  if (bwRaw != null && (!Number.isFinite(bwRaw) || bwRaw <= 0 || bwRaw > LIMITS.maxBodyweight)) {
    issues.push(issue(`${path}.bodyweightKg`, `Bodyweight must be between 0 and ${LIMITS.maxBodyweight} kg`))
  }

  const mood = r.mood == null ? undefined : clamp(toFiniteNumber(r.mood, 3), 1, 5)
  const energy = r.energy == null ? undefined : clamp(toFiniteNumber(r.energy, 3), 1, 5)

  if (issues.length) return fail(issues)

  const startedAt = typeof r.startedAt === 'string' && !Number.isNaN(new Date(r.startedAt).getTime())
    ? r.startedAt
    : new Date(`${resolvedDate}T09:00:00`).toISOString()
  const completedAt = typeof r.completedAt === 'string' && !Number.isNaN(new Date(r.completedAt).getTime())
    ? r.completedAt
    : startedAt

  const durationMin = Math.round(clamp(durationRaw, 0, LIMITS.maxDurationMin) * 10) / 10
  const notes = sanitizeString(r.notes, LIMITS.maxNotes)

  const value: WorkoutSession = withComputedTotals({
    id,
    startedAt,
    completedAt,
    date: resolvedDate,
    title,
    programId: sanitizeString(r.programId, 64) || undefined,
    dayId: sanitizeString(r.dayId, 64) || undefined,
    exercises,
    durationMin,
    notes: notes || undefined,
    mood: mood as 1 | 2 | 3 | 4 | 5 | undefined,
    energy: energy as 1 | 2 | 3 | 4 | 5 | undefined,
    sleepHours: sleepRaw != null && Number.isFinite(sleepRaw) ? clamp(sleepRaw, 0, 24) : undefined,
    bodyweightKg: bwRaw != null && Number.isFinite(bwRaw) ? clamp(bwRaw, 0, LIMITS.maxBodyweight) : undefined,
    deload: r.deload === true,
    // Derived totals are recomputed from the validated sets below — a
    // hand-edited file cannot inflate volume, set count or XP.
    xp: 0,
    xpBreakdown: [],
    volumeKg: 0,
    completedSets: 0,
    prs: Array.isArray(r.prs) ? r.prs : [],
    origin: r.origin === 'manual' || r.origin === 'import' || r.origin === 'seed' ? r.origin : 'live',
  })
  // One session cannot plausibly be worth more than a few thousand XP; clamp so
  // a crafted file cannot produce an absurd number in the history list.
  value.xp = clamp(value.xp, 0, 5000)
  return { ok: true, value, issues: warnings }
}

/* ------------------------------------------------------------------ *
 * Goals
 * ------------------------------------------------------------------ */

const GOAL_CATEGORIES = ['strength', 'muscle', 'fat-loss', 'fitness', 'habit', 'skill', 'body', 'other'] as const
const GOAL_METRICS = [
  'workouts', 'sets', 'volume', 'duration', 'streak', 'longest-streak',
  'exercise-weight', 'exercise-reps', 'exercise-e1rm', 'bodyweight', 'level', 'manual',
] as const

export function validateGoal(raw: unknown, path = 'goal'): ValidationResult<Goal> {
  const issues: ValidationIssue[] = []
  if (!raw || typeof raw !== 'object') return fail([issue(path, 'Goal must be an object')])
  const r = raw as Record<string, unknown>

  const id = sanitizeString(r.id, 64)
  if (!id) issues.push(issue(`${path}.id`, 'A goal id is required'))

  const title = sanitizeString(r.title, LIMITS.maxGoalTitle)
  if (!title) issues.push(issue(`${path}.title`, 'A goal title is required'))

  const category = (GOAL_CATEGORIES as readonly string[]).includes(String(r.category))
    ? (r.category as Goal['category'])
    : 'other'

  const metric = (GOAL_METRICS as readonly string[]).includes(String(r.metric))
    ? (r.metric as Goal['metric'])
    : 'workouts'

  const targetRaw = toFiniteNumber(r.target, Number.NaN)
  if (!Number.isFinite(targetRaw)) issues.push(issue(`${path}.target`, 'A numeric target is required'))
  else if (metric !== 'manual' && targetRaw <= 0) issues.push(issue(`${path}.target`, 'Target must be greater than zero'))
  else if (targetRaw > 1e9) issues.push(issue(`${path}.target`, 'Target is implausibly large'))

  const direction = r.direction === 'decrease' ? 'decrease' : 'increase'

  const createdAt = typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString()
  if (Number.isNaN(new Date(createdAt).getTime())) issues.push(issue(`${path}.createdAt`, 'Invalid created date'))

  const rawMilestones = Array.isArray(r.milestones) ? r.milestones.slice(0, LIMITS.maxMilestones) : []
  const milestones = rawMilestones
    .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object')
    .map((m, i) => ({
      id: sanitizeString(m.id, 64) || `ms_${i}`,
      label: sanitizeString(m.label, LIMITS.maxName) || `Milestone ${i + 1}`,
      done: m.done === true,
      completedAt: typeof m.completedAt === 'string' ? m.completedAt : undefined,
    }))

  const overrideRaw = r.progressOverride == null ? undefined : toFiniteNumber(r.progressOverride, Number.NaN)
  if (overrideRaw != null && (!Number.isFinite(overrideRaw) || overrideRaw < 0 || overrideRaw > 1)) {
    issues.push(issue(`${path}.progressOverride`, 'Manual progress must be between 0 and 1'))
  }

  if (issues.length) return fail(issues)

  return ok<Goal>({
    id,
    title,
    detail: sanitizeString(r.detail, LIMITS.maxGoalDetail) || undefined,
    category,
    metric,
    exerciseId: sanitizeString(r.exerciseId, 64) || undefined,
    target: targetRaw,
    unit: sanitizeString(r.unit, 24) || 'workouts',
    baseline: isFiniteNumber(r.baseline) ? r.baseline : undefined,
    direction,
    createdAt,
    dueAt: typeof r.dueAt === 'string' && !Number.isNaN(new Date(r.dueAt).getTime()) ? r.dueAt : undefined,
    completedAt: typeof r.completedAt === 'string' && !Number.isNaN(new Date(r.completedAt).getTime()) ? r.completedAt : undefined,
    abandonedAt: typeof r.abandonedAt === 'string' && !Number.isNaN(new Date(r.abandonedAt).getTime()) ? r.abandonedAt : undefined,
    milestones,
    progressOverride: overrideRaw != null && Number.isFinite(overrideRaw) ? clamp(overrideRaw, 0, 1) : undefined,
    why: sanitizeString(r.why, 400) || undefined,
  })
}

/* ------------------------------------------------------------------ *
 * Profile and preferences
 * ------------------------------------------------------------------ */

const THEMES = ['ember', 'frost', 'voltage', 'verdant', 'obsidian', 'aurora'] as const

export function validateProfile(raw: unknown, path = 'profile'): ValidationResult<Profile> {
  const issues: ValidationIssue[] = []
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const bw = r.bodyweightKg == null ? undefined : toFiniteNumber(r.bodyweightKg, Number.NaN)
  if (bw != null && (!Number.isFinite(bw) || bw <= 0 || bw > LIMITS.maxBodyweight)) {
    issues.push(issue(`${path}.bodyweightKg`, `Bodyweight must be between 0 and ${LIMITS.maxBodyweight} kg`))
  }
  const height = r.heightCm == null ? undefined : toFiniteNumber(r.heightCm, Number.NaN)
  if (height != null && (!Number.isFinite(height) || height < 50 || height > LIMITS.maxHeight)) {
    issues.push(issue(`${path}.heightCm`, `Height must be between 50 and ${LIMITS.maxHeight} cm`))
  }

  if (issues.length) return fail(issues)

  const joined = typeof r.joinedAt === 'string' && !Number.isNaN(new Date(r.joinedAt).getTime())
    ? r.joinedAt
    : new Date().toISOString()

  return ok<Profile>({
    displayName: sanitizeString(r.displayName, 48) || 'Athlete',
    bodyweightKg: bw != null && Number.isFinite(bw) ? round2(clamp(bw, 0, LIMITS.maxBodyweight)) : undefined,
    heightCm: height != null && Number.isFinite(height) ? Math.round(clamp(height, 50, LIMITS.maxHeight)) : undefined,
    units: r.units === 'lb' ? 'lb' : 'kg',
    joinedAt: joined,
    avatarSeed: sanitizeString(r.avatarSeed, 32) || joined.slice(0, 10),
  })
}

export function validatePreferences(raw: unknown, _path = 'preferences'): ValidationResult<Preferences> {
  const issues: ValidationIssue[] = []
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  // Preferences describe the device, not the user's training record: a corrupt
  // value is silently repaired rather than rejecting the whole object.
  const restRaw = toFiniteNumber(r.defaultRestSec, 90)
  // A zero or negative default would make the rest timer end instantly, so an
  // unreadable value falls back to 90 s and anything usable is floored at 5 s.
  const rest = !Number.isFinite(restRaw) || restRaw <= 0 ? 90 : clamp(restRaw, 5, 1800)
  if (issues.length) return fail(issues)

  return ok<Preferences>({
    theme: (THEMES as readonly string[]).includes(String(r.theme)) ? (r.theme as Preferences['theme']) : 'ember',
    motion: r.motion === 'reduced' || r.motion === 'full' ? r.motion : 'auto',
    defaultRestSec: Math.round(clamp(toFiniteNumber(rest, 90), 0, 1800)),
    sound: r.sound !== false,
    autoStartRest: r.autoStartRest !== false,
    weekStartsOn: r.weekStartsOn === 0 ? 0 : 1,
    activeProgramId: sanitizeString(r.activeProgramId, 64) || undefined,
    rotationIndex: Math.max(0, Math.round(toFiniteNumber(r.rotationIndex, 0))),
    compactTables: r.compactTables === true,
    showDocSources: r.showDocSources !== false,
  })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/* ------------------------------------------------------------------ *
 * Whole-document validation (used by import)
 * ------------------------------------------------------------------ */

export interface AppDataValidation {
  ok: boolean
  issues: ValidationIssue[]
  sessions: WorkoutSession[]
  goals: Goal[]
  profile?: Profile
  preferences?: Preferences
  rejectedSessions: number
  rejectedGoals: number
}

/**
 * Validates an arbitrary object as an AppData payload. Individual bad records
 * are dropped and reported rather than failing the whole import — a single
 * corrupt session should not cost the user their entire history.
 */
export function validateAppData(raw: unknown): AppDataValidation {
  const issues: ValidationIssue[] = []
  if (!raw || typeof raw !== 'object') {
    return { ok: false, issues: [issue('root', 'File does not contain a JSON object')], sessions: [], goals: [], rejectedSessions: 0, rejectedGoals: 0 }
  }
  const r = raw as Record<string, unknown>

  if (!Array.isArray(r.sessions)) issues.push(issue('sessions', 'Missing or invalid "sessions" array'))
  if (!Array.isArray(r.goals)) issues.push(issue('goals', 'Missing or invalid "goals" array'))

  const sessions: WorkoutSession[] = []
  let rejectedSessions = 0
  const rawSessions = Array.isArray(r.sessions) ? r.sessions : []
  rawSessions.forEach((s, i) => {
    const res = validateSession(s, `sessions[${i}]`)
    if (res.ok && res.value) {
      sessions.push(res.value)
      if (res.issues.length && issues.length < 40) issues.push(...res.issues.slice(0, 2))
    } else {
      rejectedSessions++
      if (issues.length < 40) issues.push(...res.issues.slice(0, 2).map((x) => ({ ...x, field: `sessions[${i}].${x.field}` })))
    }
  })

  const goals: Goal[] = []
  let rejectedGoals = 0
  const rawGoals = Array.isArray(r.goals) ? r.goals : []
  rawGoals.forEach((g, i) => {
    const res = validateGoal(g, `goals[${i}]`)
    if (res.ok && res.value) goals.push(res.value)
    else {
      rejectedGoals++
      if (issues.length < 40) issues.push(...res.issues.slice(0, 2).map((x) => ({ ...x, field: `goals[${i}].${x.field}` })))
    }
  })

  const profileRes = validateProfile(r.profile, 'profile')
  const prefsRes = validatePreferences(r.preferences, 'preferences')
  if (!profileRes.ok) issues.push(...profileRes.issues)
  if (!prefsRes.ok) issues.push(...prefsRes.issues)

  // A payload with no sessions and no goals is valid but empty — flag it so the
  // UI can warn rather than silently wiping the user's data.
  if (sessions.length === 0 && goals.length === 0 && rawSessions.length + rawGoals.length > 0) {
    issues.push(issue('root', 'Every record in the file was rejected'))
  }

  return {
    ok: sessions.length > 0 || goals.length > 0 || (rawSessions.length === 0 && rawGoals.length === 0),
    issues,
    sessions,
    goals,
    profile: profileRes.ok ? profileRes.value : undefined,
    preferences: prefsRes.ok ? prefsRes.value : undefined,
    rejectedSessions,
    rejectedGoals,
  }
}

/** True when the object looks like a Forge export (used before deep validation). */
export function looksLikeExport(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const r = raw as Record<string, unknown>
  return r.app === 'forge-workout' && isFiniteNumber(r.version) && Array.isArray(r.sessions)
}

export type { AppData }

import { getDay, getProgram, PROGRAMS } from '../data/programs'
import { getExercise, exerciseName } from '../data/exercises'
import { store, type DraftExercise, type SessionDraft } from './store'
import { dayForWeekday, nextRotationDay, programmeWeek, resolveDayForWeek, weekLabel, type ResolvedDay } from './program'
import { todayKey, weekdayIndex } from './dates'
import { uid } from './id'
import type { AppData, Program, ProgramDay, SetEntry, WorkoutSession } from '../types'

/**
 * Turning "start a workout" into a draft.
 *
 * Kept out of the components so the dashboard, the programme page and the
 * workouts page all build drafts exactly the same way — and so the logic can be
 * tested without rendering anything.
 */

const EMPTY_SET_COUNT = 3

export function emptySets(count = EMPTY_SET_COUNT, reps = 0, weight = 0): SetEntry[] {
  return Array.from({ length: count }, () => ({ id: uid('set'), reps, weight, completed: false }))
}

export function draftExerciseFor(exerciseId: string, defaultRestSec: number, preset: Partial<DraftExercise> = {}): DraftExercise {
  const exercise = getExercise(exerciseId)
  return {
    exerciseId,
    name: exercise?.name ?? exerciseName(exerciseId),
    unit: exercise?.unit ?? 'reps',
    restSec: defaultRestSec,
    perSide: exercise?.perSide,
    sets: emptySets(),
    skipped: false,
    note: '',
    ...preset,
  }
}

/** Builds the draft for a prescribed programme day, block overrides included. */
export function draftFromProgramDay(
  programId: string,
  dayId: string,
  week: number,
  defaultRestSec: number,
): Omit<SessionDraft, 'id' | 'startedAt' | 'notes' | 'rest'> | null {
  const resolved = resolveDayForWeek(programId, dayId, week)
  if (!resolved) return null
  const { program, day, deload } = resolved

  const exercises: DraftExercise[] = resolved.exercises.map((prescribed) => {
    const exercise = getExercise(prescribed.exerciseId)
    const setCount = Math.max(1, prescribed.sets)
    return {
      exerciseId: prescribed.exerciseId,
      name: exercise?.name ?? exerciseName(prescribed.exerciseId),
      unit: prescribed.unit ?? exercise?.unit ?? 'reps',
      target: prescribed.target,
      rpeTarget: prescribed.rpe,
      restSec: prescribed.restSec || defaultRestSec,
      perSide: prescribed.perSide ?? exercise?.perSide,
      // The rep target is pre-filled only when the prescription is a single
      // number. The load is never guessed — that would be fake progress.
      sets: emptySets(setCount, prescribed.repsMin === prescribed.repsMax ? prescribed.repsMin : 0, 0),
      skipped: false,
      note: '',
    }
  })

  return {
    title: `${program.name} · ${day.badge ? `${day.badge} · ` : ''}${day.name.split('—')[0].trim()}`,
    programId,
    dayId,
    week: resolved.week,
    exercises,
    deload,
  }
}

/* --------------------------------------------------------------------------
   Starting
   -------------------------------------------------------------------------- */

export function startFreeSession(title = 'Free session'): SessionDraft {
  const draft: SessionDraft = {
    id: uid('session'),
    title,
    startedAt: new Date().toISOString(),
    exercises: [],
    notes: '',
    deload: false,
    rest: null,
  }
  store.startDraft(draft)
  return draft
}

export function startProgramDay(programId: string, dayId: string, week: number, defaultRestSec: number): SessionDraft | null {
  const body = draftFromProgramDay(programId, dayId, week, defaultRestSec)
  if (!body) return null
  const draft: SessionDraft = {
    id: uid('session'),
    startedAt: new Date().toISOString(),
    notes: '',
    rest: null,
    ...body,
  }
  store.startDraft(draft)
  store.updatePreferences({ activeProgramId: programId })
  return draft
}

/* --------------------------------------------------------------------------
   "What should I do today?"
   -------------------------------------------------------------------------- */

export type TodayPlan =
  | {
      kind: 'scheduled'
      program: Program
      day: ProgramDay
      resolved: ResolvedDay
      week: number
      /** True when the programme actually puts this day on today's weekday. */
      onSchedule: boolean
      source: 'active' | 'suggested'
      reason: string
    }
  | { kind: 'rest'; reason: string }
  | { kind: 'none'; reason: string }

function sessionsFor(programId: string, sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((s) => s.programId === programId)
}

/** Week number of a programme, from the first session logged on it. */
export function weekForProgram(program: Program, sessions: readonly WorkoutSession[], weekStartsOn: 0 | 1 = 1, fallbackKey = todayKey()): number {
  const mine = sessionsFor(program.id, sessions).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  if (mine.length === 0) return 1
  return programmeWeek(mine[0].date, fallbackKey, weekStartsOn)
}

export function isProgramUnlocked(program: Program, unlockedIds: readonly string[]): boolean {
  return !program.unlockId || unlockedIds.includes(program.unlockId)
}

/**
 * Resolves today's workout.
 *
 * Uses the active programme when one is set, otherwise suggests the first
 * unlocked programme that has something scheduled today. It never invents a
 * session: when nothing is scheduled it says so and explains why.
 */
export function todayPlan(data: AppData, unlockedIds: readonly string[]): TodayPlan {
  const today = todayKey()
  const weekday = weekdayIndex(today)
  const { weekStartsOn } = data.preferences

  const candidates: Program[] = []
  const active = data.preferences.activeProgramId ? getProgram(data.preferences.activeProgramId) : undefined
  if (active && isProgramUnlocked(active, unlockedIds)) candidates.push(active)
  for (const program of PROGRAMS) {
    if (candidates.some((p) => p.id === program.id)) continue
    if (!isProgramUnlocked(program, unlockedIds)) continue
    candidates.push(program)
  }

  let fallback: { program: Program; day: ProgramDay; resolved: ResolvedDay; week: number } | null = null

  for (const program of candidates) {
    const week = weekForProgram(program, data.sessions, weekStartsOn)
    const mine = sessionsFor(program.id, data.sessions)
    const scheduled = dayForWeekday(program, weekday)
    const day = scheduled ?? nextRotationDay(program, mine.length)
    const resolved = resolveDayForWeek(program.id, day.id, week)
    if (!resolved) continue

    if (scheduled) {
      return {
        kind: 'scheduled',
        program,
        day: scheduled,
        resolved,
        week: resolved.week,
        onSchedule: true,
        source: active?.id === program.id ? 'active' : 'suggested',
        reason:
          mine.length === 0
            ? `${program.daysPerWeek} days a week · ${weekLabel(program, resolved.week)}`
            : `${mine.length} ${mine.length === 1 ? 'session' : 'sessions'} logged · ${weekLabel(program, resolved.week)}`,
      }
    }
    if (!fallback) fallback = { program, day, resolved, week: resolved.week }
  }

  if (fallback) {
    const mine = sessionsFor(fallback.program.id, data.sessions)
    return {
      kind: 'scheduled',
      program: fallback.program,
      day: fallback.day,
      resolved: fallback.resolved,
      week: fallback.resolved.week,
      onSchedule: false,
      source: active?.id === fallback.program.id ? 'active' : 'suggested',
      reason:
        mine.length === 0
          ? `Not on today's schedule, but it is the next day in the rotation`
          : `Next in the rotation · ${weekLabel(fallback.program, fallback.resolved.week)}`,
    }
  }

  if (candidates.length === 0) {
    return { kind: 'none', reason: 'No unlocked programme yet — start with a free session or the beginner programme.' }
  }
  return { kind: 'rest', reason: 'Every unlocked programme has a rest day scheduled for today.' }
}

/** Convenience for components that already hold the app state. */
export function useTodayPlan(data: AppData, unlockedIds: readonly string[]): TodayPlan {
  return todayPlan(data, unlockedIds)
}

export function getProgramDay(programId: string, dayId: string): ProgramDay | undefined {
  return getDay(programId, dayId)
}

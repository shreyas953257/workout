import { useSyncExternalStore } from 'react'
import type {
  AppData,
  Goal,
  GoalMilestone,
  Preferences,
  Profile,
  ProgressSnapshot,
  SetEntry,
  SetUnit,
  WorkoutSession,
} from '../types'
import { computeProgress } from './progress'
import { sessionBaseXp, withComputedTotals } from './xp'
import {
  DRAFT_KEY,
  clearDraft,
  defaultAppData,
  getStorage,
  isPersistent,
  loadAppData,
  loadDraft,
  saveAppData,
  saveDraft,
} from './storage'
import { clamp, sanitizeString, validateGoal, validateSession } from './validation'
import { toDateKey, todayKey } from './dates'
import { uid } from './id'

/**
 * Application store.
 *
 * A single mutable object behind `useSyncExternalStore`. Persisted state is
 * `AppData`; everything earned is re-derived by `computeProgress` whenever the
 * inputs change, and the derived snapshot is memoised so React sees a stable
 * reference between updates.
 *
 * An in-flight workout is persisted separately (see `DRAFT_KEY`) so that a
 * reload or a browser crash mid-session does not cost the user their log.
 */

export interface DraftExercise {
  exerciseId: string
  name: string
  unit: SetUnit
  target?: string
  rpeTarget?: string
  restSec: number
  perSide?: boolean
  sets: SetEntry[]
  skipped: boolean
  note: string
}

export interface RestTimerState {
  totalSec: number
  /** Epoch ms at which the timer hits zero. Non-null means running. */
  endsAt: number | null
  /** Frozen remaining seconds while paused. */
  remainingSec: number
  exerciseId?: string
  setIndex?: number
}

export interface SessionDraft {
  id: string
  title: string
  programId?: string
  dayId?: string
  week?: number
  startedAt: string
  exercises: DraftExercise[]
  notes: string
  mood?: 1 | 2 | 3 | 4 | 5
  energy?: 1 | 2 | 3 | 4 | 5
  sleepHours?: number
  deload: boolean
  rest: RestTimerState | null
}

export interface AppState {
  data: AppData
  progress: ProgressSnapshot
  draft: SessionDraft | null
  /** Storage repair notes from load, shown once in Settings → Data. */
  notices: string[]
  saveError: string | null
  persistent: boolean
  /** Ids the UI has not yet shown a toast for. */
  pendingNotifications: string[]
  lastSavedAt: string | null
}

type Listener = () => void

function isDraftShape(value: unknown): value is SessionDraft {
  if (!value || typeof value !== 'object') return false
  const d = value as Record<string, unknown>
  return typeof d.id === 'string' && typeof d.startedAt === 'string' && Array.isArray(d.exercises)
}

export class Store {
  private state: AppState
  private listeners = new Set<Listener>()
  private progressInputsKey = ''

  constructor() {
    const storage = getStorage()
    const loaded = loadAppData(storage)
    const draft = loadDraft<unknown>(storage)
    this.state = {
      data: loaded.data,
      progress: computeProgress({
        sessions: loaded.data.sessions,
        goals: loaded.data.goals,
        profile: loaded.data.profile,
        preferences: loaded.data.preferences,
        acknowledged: loaded.data.acknowledged,
      }),
      draft: isDraftShape(draft) ? sanitizeDraft(draft) : null,
      notices: loaded.notices,
      saveError: null,
      persistent: isPersistent(),
      pendingNotifications: [],
      lastSavedAt: null,
    }
    this.progressInputsKey = this.inputsKey(this.state.data)
    this.state = { ...this.state, pendingNotifications: this.state.progress.newlyUnlocked }
  }

  /* ----------------------------- plumbing ----------------------------- */

  private inputsKey(data: AppData): string {
    // Cheap structural fingerprint: enough to detect a change that could alter
    // derived progress without re-serialising the whole document every time.
    const lastSession = data.sessions[data.sessions.length - 1]
    return [
      data.sessions.length,
      lastSession?.id ?? '',
      lastSession?.completedAt ?? '',
      data.goals.length,
      data.goals.map((g) => `${g.id}:${g.completedAt ?? ''}:${g.milestones.filter((m) => m.done).length}`).join(','),
      data.profile.bodyweightKg ?? '',
      data.preferences.weekStartsOn,
      data.acknowledged.length,
    ].join('|')
  }

  private recomputeProgress(data: AppData): ProgressSnapshot {
    return computeProgress({
      sessions: data.sessions,
      goals: data.goals,
      profile: data.profile,
      preferences: data.preferences,
      acknowledged: data.acknowledged,
    })
  }

  private commit(next: Partial<AppState>, options: { persist?: boolean; persistDraft?: boolean } = {}): void {
    const data = next.data ?? this.state.data
    const key = this.inputsKey(data)
    let progress = this.state.progress
    if (key !== this.progressInputsKey || next.data) {
      progress = next.progress ?? this.recomputeProgress(data)
      this.progressInputsKey = key
    } else if (next.progress) {
      progress = next.progress
    }

    let saveError = this.state.saveError
    let lastSavedAt = this.state.lastSavedAt
    if (options.persist !== false) {
      const res = saveAppData(data)
      saveError = res.ok ? null : res.error ?? 'Could not save.'
      lastSavedAt = res.ok ? new Date().toISOString() : lastSavedAt
    }
    if (options.persistDraft !== false) {
      const draft = next.draft !== undefined ? next.draft : this.state.draft
      if (draft) saveDraft(draft)
      else clearDraft()
    }

    const pending = next.pendingNotifications ?? progress.newlyUnlocked.filter((id) => !data.acknowledged.includes(id))

    this.state = {
      ...this.state,
      ...next,
      data,
      progress,
      saveError,
      lastSavedAt,
      pendingNotifications: pending,
    }
    this.emit()
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): AppState => this.state

  /* ----------------------------- sessions ----------------------------- */

  addSession(session: WorkoutSession): { ok: boolean; session?: WorkoutSession; issues?: string[] } {
    const res = validateSession(session)
    if (!res.ok || !res.value) {
      return { ok: false, issues: res.issues.map((i) => `${i.field}: ${i.message}`) }
    }
    const prepared = withComputedTotals({ ...res.value, origin: res.value.origin || 'live' })
    const sessions = [...this.state.data.sessions, prepared]
    this.commit({ data: { ...this.state.data, sessions } }, { persistDraft: false })
    return { ok: true, session: prepared }
  }

  updateSession(id: string, patch: Partial<WorkoutSession>): boolean {
    const index = this.state.data.sessions.findIndex((s) => s.id === id)
    if (index === -1) return false
    const merged = { ...this.state.data.sessions[index], ...patch, id }
    const res = validateSession(merged)
    if (!res.ok || !res.value) return false
    const prepared = withComputedTotals(res.value)
    const sessions = [...this.state.data.sessions]
    sessions[index] = prepared
    this.commit({ data: { ...this.state.data, sessions } }, { persistDraft: false })
    return true
  }

  deleteSession(id: string): boolean {
    const sessions = this.state.data.sessions.filter((s) => s.id !== id)
    if (sessions.length === this.state.data.sessions.length) return false
    this.commit({ data: { ...this.state.data, sessions } }, { persistDraft: false })
    return true
  }

  /** Total XP attributable to one session, including PR and streak awards. */
  xpForSession(sessionId: string): number {
    return this.state.progress.xpEvents
      .filter((e) => e.sessionId === sessionId)
      .reduce((n, e) => n + e.amount, 0)
  }

  /* ------------------------------ draft ------------------------------- */

  startDraft(draft: SessionDraft): void {
    const clean = sanitizeDraft(draft)
    this.commit({ draft: clean }, { persist: false })
  }

  updateDraft(patch: Partial<SessionDraft>): void {
    if (!this.state.draft) return
    const next = sanitizeDraft({ ...this.state.draft, ...patch })
    this.commit({ draft: next }, { persist: false })
  }

  clearDraft(): void {
    this.commit({ draft: null }, { persist: false })
  }

  setExerciseSets(exerciseIndex: number, sets: SetEntry[]): void {
    const draft = this.state.draft
    if (!draft) return
    const exercises = draft.exercises.map((e, i) => (i === exerciseIndex ? { ...e, sets } : e))
    this.commit({ draft: sanitizeDraft({ ...draft, exercises }) }, { persist: false })
  }

  updateSet(exerciseIndex: number, setIndex: number, patch: Partial<SetEntry>): void {
    const draft = this.state.draft
    if (!draft) return
    const exercises = draft.exercises.map((e, i) => {
      if (i !== exerciseIndex) return e
      const sets = e.sets.map((s, j) => {
        if (j !== setIndex) return s
        const merged = { ...s, ...patch }
        return {
          ...merged,
          reps: Math.max(0, Math.round(clamp(Number(merged.reps) || 0, 0, 500))),
          weight: Math.max(0, Math.round(clamp(Number(merged.weight) || 0, 0, 1000) * 100) / 100),
          rpe: merged.rpe == null ? undefined : clamp(Number(merged.rpe), 1, 10),
        } as SetEntry
      })
      return { ...e, sets }
    })
    this.commit({ draft: sanitizeDraft({ ...draft, exercises }) }, { persist: false })
  }

  addSet(exerciseIndex: number, template?: Partial<SetEntry>): void {
    const draft = this.state.draft
    if (!draft) return
    const exercises = draft.exercises.map((e, i) => {
      if (i !== exerciseIndex) return e
      if (e.sets.length >= 40) return e
      // A new set starts as a copy of the previous one — that is what a lifter
      // actually wants when adding a set mid-exercise.
      const last = e.sets[e.sets.length - 1]
      const next: SetEntry = {
        id: uid('set'),
        reps: template?.reps ?? last?.reps ?? 0,
        weight: template?.weight ?? last?.weight ?? 0,
        rpe: template?.rpe,
        completed: false,
      }
      return { ...e, sets: [...e.sets, next] }
    })
    this.commit({ draft: sanitizeDraft({ ...draft, exercises }) }, { persist: false })
  }

  removeSet(exerciseIndex: number, setIndex: number): void {
    const draft = this.state.draft
    if (!draft) return
    const exercises = draft.exercises.map((e, i) =>
      i === exerciseIndex ? { ...e, sets: e.sets.filter((_, j) => j !== setIndex) } : e,
    )
    this.commit({ draft: sanitizeDraft({ ...draft, exercises }) }, { persist: false })
  }

  toggleSkip(exerciseIndex: number, skipped?: boolean): void {
    const draft = this.state.draft
    if (!draft) return
    const exercises = draft.exercises.map((e, i) =>
      i === exerciseIndex ? { ...e, skipped: skipped ?? !e.skipped } : e,
    )
    this.commit({ draft: sanitizeDraft({ ...draft, exercises }) }, { persist: false })
  }

  /* ---------------------------- rest timer ---------------------------- */

  startRest(totalSec: number, context?: { exerciseId?: string; setIndex?: number }): void {
    const draft = this.state.draft
    if (!draft) return
    const total = Math.round(clamp(totalSec, 0, 1800))
    this.commit(
      {
        draft: sanitizeDraft({
          ...draft,
          rest: { totalSec: total, endsAt: Date.now() + total * 1000, remainingSec: total, ...context },
        }),
      },
      { persist: false },
    )
  }

  pauseRest(): void {
    const draft = this.state.draft
    if (!draft?.rest || draft.rest.endsAt == null) return
    const remaining = Math.max(0, (draft.rest.endsAt - Date.now()) / 1000)
    this.commit(
      { draft: sanitizeDraft({ ...draft, rest: { ...draft.rest, endsAt: null, remainingSec: remaining } }) },
      { persist: false },
    )
  }

  resumeRest(): void {
    const draft = this.state.draft
    if (!draft?.rest || draft.rest.endsAt != null) return
    this.commit(
      {
        draft: sanitizeDraft({
          ...draft,
          rest: { ...draft.rest, endsAt: Date.now() + draft.rest.remainingSec * 1000 },
        }),
      },
      { persist: false },
    )
  }

  resetRest(): void {
    const draft = this.state.draft
    if (!draft?.rest) return
    this.commit(
      {
        draft: sanitizeDraft({
          ...draft,
          rest: { ...draft.rest, endsAt: Date.now() + draft.rest.totalSec * 1000, remainingSec: draft.rest.totalSec },
        }),
      },
      { persist: false },
    )
  }

  skipRest(): void {
    const draft = this.state.draft
    if (!draft) return
    this.commit({ draft: sanitizeDraft({ ...draft, rest: null }) }, { persist: false })
  }

  /** Called on an interval by the timer UI; commits only when the value moves. */
  tickRest(): void {
    const draft = this.state.draft
    if (!draft?.rest) return
    if (draft.rest.endsAt == null) return
    const remaining = Math.max(0, (draft.rest.endsAt - Date.now()) / 1000)
    if (Math.abs(remaining - draft.rest.remainingSec) < 0.25 && remaining > 0) return
    if (remaining <= 0) {
      this.commit({ draft: sanitizeDraft({ ...draft, rest: { ...draft.rest, endsAt: null, remainingSec: 0 } }) }, { persist: false })
      return
    }
    // Avoid a full progress recompute on every tick.
    this.state = {
      ...this.state,
      draft: { ...draft, rest: { ...draft.rest, remainingSec: remaining } },
    }
    this.emit()
  }

  restRemaining(): number {
    const rest = this.state.draft?.rest
    if (!rest) return 0
    if (rest.endsAt != null) return Math.max(0, (rest.endsAt - Date.now()) / 1000)
    return Math.max(0, rest.remainingSec)
  }

  /* ------------------------------- goals ------------------------------ */

  addGoal(goal: Goal): { ok: boolean; goal?: Goal; issues?: string[] } {
    const res = validateGoal(goal)
    if (!res.ok || !res.value) return { ok: false, issues: res.issues.map((i) => `${i.field}: ${i.message}`) }
    const goals = [...this.state.data.goals, res.value]
    this.commit({ data: { ...this.state.data, goals } })
    return { ok: true, goal: res.value }
  }

  updateGoal(id: string, patch: Partial<Goal>): boolean {
    const index = this.state.data.goals.findIndex((g) => g.id === id)
    if (index === -1) return false
    const res = validateGoal({ ...this.state.data.goals[index], ...patch, id })
    if (!res.ok || !res.value) return false
    const goals = [...this.state.data.goals]
    goals[index] = res.value
    this.commit({ data: { ...this.state.data, goals } })
    return true
  }

  deleteGoal(id: string): boolean {
    const goals = this.state.data.goals.filter((g) => g.id !== id)
    if (goals.length === this.state.data.goals.length) return false
    this.commit({ data: { ...this.state.data, goals } })
    return true
  }

  completeGoal(id: string, at: string = new Date().toISOString()): boolean {
    return this.updateGoal(id, { completedAt: at, abandonedAt: undefined })
  }

  reopenGoal(id: string): boolean {
    return this.updateGoal(id, { completedAt: undefined, abandonedAt: undefined })
  }

  abandonGoal(id: string, at: string = new Date().toISOString()): boolean {
    return this.updateGoal(id, { abandonedAt: at, completedAt: undefined })
  }

  addMilestone(goalId: string, label: string): boolean {
    const goal = this.state.data.goals.find((g) => g.id === goalId)
    if (!goal || goal.milestones.length >= 50) return false
    const milestone: GoalMilestone = { id: uid('ms'), label: sanitizeString(label, 120) || 'Milestone', done: false }
    return this.updateGoal(goalId, { milestones: [...goal.milestones, milestone] })
  }

  toggleMilestone(goalId: string, milestoneId: string): boolean {
    const goal = this.state.data.goals.find((g) => g.id === goalId)
    if (!goal) return false
    const milestones = goal.milestones.map((m) =>
      m.id === milestoneId
        ? { ...m, done: !m.done, completedAt: !m.done ? new Date().toISOString() : undefined }
        : m,
    )
    return this.updateGoal(goalId, { milestones })
  }

  deleteMilestone(goalId: string, milestoneId: string): boolean {
    const goal = this.state.data.goals.find((g) => g.id === goalId)
    if (!goal) return false
    return this.updateGoal(goalId, { milestones: goal.milestones.filter((m) => m.id !== milestoneId) })
  }

  /* ------------------------- profile and prefs ------------------------- */

  updateProfile(patch: Partial<Profile>): void {
    const merged: Profile = { ...this.state.data.profile, ...patch }
    if (merged.bodyweightKg != null) {
      merged.bodyweightKg = clamp(Number(merged.bodyweightKg) || 0, 0, 500) || undefined
    }
    if (merged.heightCm != null) {
      merged.heightCm = Math.round(clamp(Number(merged.heightCm) || 0, 50, 260)) || undefined
    }
    merged.displayName = sanitizeString(merged.displayName, 48) || 'Athlete'
    merged.units = merged.units === 'lb' ? 'lb' : 'kg'
    this.commit({ data: { ...this.state.data, profile: merged } })
  }

  updatePreferences(patch: Partial<Preferences>): void {
    const merged: Preferences = { ...this.state.data.preferences, ...patch }
    merged.defaultRestSec = Math.round(clamp(Number(merged.defaultRestSec) || 0, 0, 1800))
    merged.rotationIndex = Math.max(0, Math.round(Number(merged.rotationIndex) || 0))
    this.commit({ data: { ...this.state.data, preferences: merged } })
  }

  /* --------------------------- notifications --------------------------- */

  acknowledge(ids: string[]): void {
    if (ids.length === 0) return
    const acknowledged = [...new Set([...this.state.data.acknowledged, ...ids])].slice(-5000)
    this.commit({ data: { ...this.state.data, acknowledged }, pendingNotifications: [] }, { persistDraft: false })
  }

  dismissNotices(): void {
    this.state = { ...this.state, notices: [] }
    this.emit()
  }

  /* ------------------------------ data ops ----------------------------- */

  replaceData(data: AppData): void {
    this.progressInputsKey = ''
    this.commit({ data, draft: null })
  }

  resetAll(): void {
    this.progressInputsKey = ''
    this.commit({ data: defaultAppData(), draft: null, notices: [] })
  }

  /** Re-runs the derivation without touching stored data. Used after a repair. */
  refresh(): void {
    this.progressInputsKey = ''
    this.commit({}, { persist: false, persistDraft: false })
  }

  /** Estimate for the pre-session card: XP a day would award if completed as prescribed. */
  estimateDraftXp(draft: SessionDraft): number {
    const preview: WorkoutSession = draftToSession(draft, { compute: false })
    return sessionBaseXp(preview).total
  }
}

/* ------------------------------------------------------------------ *
 * Draft → session
 * ------------------------------------------------------------------ */

export function draftToSession(
  draft: SessionDraft,
  options: { completedAt?: string; durationMin?: number; compute?: boolean } = {},
): WorkoutSession {
  const startedAt = draft.startedAt || new Date().toISOString()
  const completedAt = options.completedAt ?? new Date().toISOString()
  const elapsedMin = (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000
  const durationMin = options.durationMin ?? Math.round(clamp(Number.isFinite(elapsedMin) ? elapsedMin : 0, 0, 720) * 10) / 10

  const exercises = draft.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    name: e.name,
    unit: e.unit,
    target: e.target,
    rpeTarget: e.rpeTarget,
    skipped: e.skipped,
    note: sanitizeString(e.note, 4000) || undefined,
    sets: e.sets.map((s) => ({
      id: s.id || uid('set'),
      reps: Math.max(0, Math.round(Number(s.reps) || 0)),
      weight: Math.max(0, Math.round((Number(s.weight) || 0) * 100) / 100),
      rpe: s.rpe == null ? undefined : clamp(Number(s.rpe), 1, 10),
      completed: s.completed === true,
      warmup: s.warmup === true,
    })),
  }))

  const base: WorkoutSession = {
    id: draft.id,
    startedAt,
    completedAt,
    date: toDateKey(completedAt) || todayKey(),
    title: sanitizeString(draft.title, 120) || 'Workout',
    programId: draft.programId,
    dayId: draft.dayId,
    exercises,
    durationMin,
    notes: sanitizeString(draft.notes, 4000) || undefined,
    mood: draft.mood,
    energy: draft.energy,
    sleepHours: draft.sleepHours,
    deload: draft.deload === true,
    xp: 0,
    xpBreakdown: [],
    volumeKg: 0,
    completedSets: 0,
    prs: [],
    origin: 'live',
  }

  return options.compute === false ? base : withComputedTotals(base)
}

/** Defensive normalisation of a draft loaded from storage. */
function sanitizeDraft(draft: SessionDraft): SessionDraft {
  const exercises: DraftExercise[] = (Array.isArray(draft.exercises) ? draft.exercises : []).slice(0, 60).map((e) => ({
    exerciseId: sanitizeString(e.exerciseId, 64) || 'unknown',
    name: sanitizeString(e.name, 120) || 'Exercise',
    unit: e.unit === 'seconds' || e.unit === 'metres' ? e.unit : 'reps',
    target: e.target ? sanitizeString(e.target, 32) : undefined,
    rpeTarget: e.rpeTarget ? sanitizeString(e.rpeTarget, 24) : undefined,
    restSec: Math.round(clamp(Number(e.restSec) || 0, 0, 1800)),
    perSide: e.perSide === true,
    skipped: e.skipped === true,
    note: sanitizeString(e.note ?? '', 4000),
    sets: (Array.isArray(e.sets) ? e.sets : []).slice(0, 40).map((s, i) => ({
      id: sanitizeString(s.id, 64) || `set_${i}`,
      reps: Math.max(0, Math.round(clamp(Number(s.reps) || 0, 0, 500))),
      weight: Math.max(0, Math.round(clamp(Number(s.weight) || 0, 0, 1000) * 100) / 100),
      rpe: s.rpe == null || s.rpe === undefined ? undefined : clamp(Number(s.rpe), 1, 10),
      completed: s.completed === true,
      warmup: s.warmup === true,
    })),
  }))

  let rest: RestTimerState | null = null
  if (draft.rest && typeof draft.rest === 'object') {
    const totalSec = Math.round(clamp(Number(draft.rest.totalSec) || 0, 0, 1800))
    const endsAt = typeof draft.rest.endsAt === 'number' && Number.isFinite(draft.rest.endsAt) ? draft.rest.endsAt : null
    // A timer that expired while the tab was closed comes back finished, not running.
    const expired = endsAt != null && endsAt <= Date.now()
    rest = {
      totalSec,
      endsAt: expired ? null : endsAt,
      remainingSec: expired ? 0 : Math.round(clamp(Number(draft.rest.remainingSec) || 0, 0, 1800)),
      exerciseId: draft.rest.exerciseId,
      setIndex: draft.rest.setIndex,
    }
  }

  return {
    id: sanitizeString(draft.id, 64) || uid('draft'),
    title: sanitizeString(draft.title, 120) || 'Workout',
    programId: draft.programId ? sanitizeString(draft.programId, 64) : undefined,
    dayId: draft.dayId ? sanitizeString(draft.dayId, 64) : undefined,
    week: Number.isFinite(draft.week) ? draft.week : undefined,
    startedAt:
      typeof draft.startedAt === 'string' && !Number.isNaN(new Date(draft.startedAt).getTime())
        ? draft.startedAt
        : new Date().toISOString(),
    exercises,
    notes: sanitizeString(draft.notes ?? '', 4000),
    mood: draft.mood,
    energy: draft.energy,
    sleepHours: draft.sleepHours == null ? undefined : clamp(Number(draft.sleepHours) || 0, 0, 24),
    deload: draft.deload === true,
    rest,
  }
}

/* ------------------------------------------------------------------ *
 * Singleton and hooks
 * ------------------------------------------------------------------ */

export const store = new Store()

export function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function useData(): AppData {
  return useAppState().data
}

export function useProgress(): ProgressSnapshot {
  return useAppState().progress
}

export function useDraft(): SessionDraft | null {
  return useAppState().draft
}

export function usePreferences(): Preferences {
  return useAppState().data.preferences
}

export function useProfile(): Profile {
  return useAppState().data.profile
}

export { DRAFT_KEY }
